/*
 * Domain Search Application
 * JavaScript functionality for searching domain information
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const domainInput = document.getElementById('domainInput');
    const searchButton = document.getElementById('searchButton');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');
    const resultsElement = document.getElementById('results');
    const historyContainer = document.getElementById('history-container');
    const historyList = document.getElementById('history-list');
    
    // Event Listeners
    searchButton.addEventListener('click', performSearch);
    domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Load search history on page load
    loadSearchHistory();
    
    // Performs domain search when the search button is clicked
    async function performSearch() {
        const domain = domainInput.value.trim();
        
        if (!domain) {
            showError('Please enter a domain name');
            return;
        }
        
        if (!isValidDomain(domain)) {
            showError('Please enter a valid domain name');
            return;
        }
        
        // Show loading state
        showLoading();
        
        // Check which API to use
        const apiType = document.querySelector('input[name="api"]:checked').value;
        
        try {
            let data;
            
            if (apiType === 'external') {
                // Using WHOIS XML API for domain information
                const apiKey = 'at_jJ0EuSZWRtfEIgTU5qAHpwhnS1sYT';
                const url = `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${apiKey}&domainName=${domain}&outputFormat=JSON`;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                data = await response.json();
            } else {
                // Using our internal PHP backend
                const url = `backend.php?domain=${encodeURIComponent(domain)}`;
                
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
            }
            
            // Process and display the result
            displayResult(domain, data, apiType);
            
            // Save search to history
            saveToHistory(domain, data, apiType);
            
        } catch (error) {
            console.error('Error fetching domain information:', error);
            showError(`Failed to retrieve domain information: ${error.message}`);
        }
    }
    
    /**
     * Validates if the input is a proper domain name
     * @param {string} domain - The domain to validate
     * @returns {boolean} - Whether the domain is valid
     */
    function isValidDomain(domain) {
        // Simple domain validation regex
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        return domainRegex.test(domain);
    }
    
    /**
     * Shows the loading indicator and hides other result elements
     */
    function showLoading() {
        loadingElement.classList.remove('hidden');
        errorElement.classList.add('hidden');
        resultsElement.innerHTML = '';
    }
    
    /**
     * Shows an error message
     * @param {string} message - The error message to display
     */
    function showError(message) {
        loadingElement.classList.add('hidden');
        errorElement.classList.remove('hidden');
        errorElement.textContent = message;
        resultsElement.innerHTML = '';
    }
    
    /**
     * Displays the search result
     * @param {string} domain - The domain that was searched
     * @param {Object} data - The domain information returned from the API
     * @param {string} apiType - The type of API used for the search
     */
    function displayResult(domain, data, apiType) {
        loadingElement.classList.add('hidden');
        errorElement.classList.add('hidden');
        
        let html = '';
        
        if (apiType === 'external') {
            try {
                const whoisRecord = data.WhoisRecord;
                
                html = `
                    <div class="result-card">
                        <h3>${domain}</h3>
                        <p><strong>Domain Name:</strong> ${whoisRecord.domainName || 'N/A'}</p>
                        <p><strong>Registrar:</strong> ${whoisRecord.registrarName || 'N/A'}</p>
                        <p><strong>Creation Date:</strong> ${formatDate(whoisRecord.createdDate) || 'N/A'}</p>
                        <p><strong>Expiration Date:</strong> ${formatDate(whoisRecord.expiresDate) || 'N/A'}</p>
                        <p><strong>Updated Date:</strong> ${formatDate(whoisRecord.updatedDate) || 'N/A'}</p>
                    `;
                
                if (whoisRecord.registrant) {
                    html += `
                        <p><strong>Registrant:</strong> ${whoisRecord.registrant.organization || 'N/A'}</p>
                        <p><strong>Country:</strong> ${whoisRecord.registrant.country || 'N/A'}</p>
                    `;
                }
                
                html += '</div>';
            } catch (error) {
                console.error('Error processing data:', error);
                html = `
                    <div class="result-card">
                        <h3>${domain}</h3>
                        <p>Limited information available for this domain.</p>
                    </div>
                `;
            }
        } else {
            // Internal API
            html = `
                <div class="result-card">
                    <h3>${domain}</h3>
                `;
                
            // Show cache status if available
            if (data.hasOwnProperty('cached')) {
                console.log("Adding cache status:", data.cached);  // debug line
                const cacheStatus = data.cached ? 'Results from cache' : 'Fresh results';
                const cacheClass = data.cached ? 'cache-stored' : 'cache-fresh';
                html += `<p class="cache-status ${cacheClass}">${cacheStatus}</p>`;
            }
            
            
            html += `
                <p><strong>IP Address:</strong> ${data.ip || 'N/A'}</p>
            `;
                
            // Add nameservers
            if (data.nameservers && data.nameservers.length > 0) {
                html += '<p><strong>Nameservers:</strong></p><ul>';
                data.nameservers.forEach(ns => {
                    html += `<li>${ns}</li>`;
                });
                html += '</ul>';
            }
            
            // Add DNS records
            if (data.dns && Object.keys(data.dns).length > 0) {
                html += '<p><strong>DNS Records:</strong></p>';
                
                for (const [type, records] of Object.entries(data.dns)) {
                    if (records.length > 0) {
                        html += `<p>Type ${type}:</p><ul>`;
                        
                        records.forEach(record => {
                            if (type === 'A') {
                                html += `<li>IP: ${record.ip || 'N/A'}</li>`;
                            } else if (type === 'MX') {
                                html += `<li>Host: ${record.target || 'N/A'} (Priority: ${record.pri || 'N/A'})</li>`;
                            } else if (type === 'NS') {
                                html += `<li>Host: ${record.target || 'N/A'}</li>`;
                            } else {
                                html += `<li>${JSON.stringify(record)}</li>`;
                            }
                        });
                        
                        html += '</ul>';
                    }
                }
            }
            
            // Add WHOIS info if available
            if (data.whois) {
                html += `
                    <p><strong>WHOIS Information:</strong></p>
                    <pre>${data.whois}</pre>
                `;
            }
            
            html += '</div>';
        }
        
        resultsElement.innerHTML = html;
    }
    
    /**
     * Formats a date string into a more readable format
     * @param {string} dateString - The date string to format
     * @returns {string} - The formatted date string
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    }
    
    /**
     * Saves the search to browser's local storage
     * @param {string} domain - The domain that was searched
     * @param {Object} data - The domain information returned from the API
     * @param {string} apiType - The type of API used for the search
     */
    function saveToHistory(domain, data, apiType) {
        // Get existing history or initialize empty array
        let history = JSON.parse(localStorage.getItem('domainSearchHistory') || '[]');
        
        // Check if this domain already exists in history
        const existingIndex = history.findIndex(item => item.domain === domain);
        
        // If domain exists, remove it (we'll add the updated version to the top)
        if (existingIndex !== -1) {
            history.splice(existingIndex, 1);
        }
        
        // Add new search at the beginning
        history.unshift({
            domain: domain,
            data: data,
            apiType: apiType,
            timestamp: new Date().toISOString()
        });
        
        // Limit history to 10 items
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        // Save back to localStorage
        localStorage.setItem('domainSearchHistory', JSON.stringify(history));
        
        // Update the history display
        loadSearchHistory();
    }

    function clearSearchHistory() {
        localStorage.removeItem('domainSearchHistory');
        loadSearchHistory();
        console.log('Search history cleared');
    }
    
    /**
     * Loads search history from local storage and displays it
     */
    function loadSearchHistory() {
        const history = JSON.parse(localStorage.getItem('domainSearchHistory') || '[]');
        
        if (history.length === 0) {
            historyContainer.classList.add('hidden');
            return;
        }
        
        historyContainer.classList.remove('hidden');
        historyList.innerHTML = '';
        
        history.forEach((item) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const date = new Date(item.timestamp);
            const formattedDate = date.toLocaleString();
            
            historyItem.innerHTML = `
                <div class="history-domain">${item.domain}</div>
                <div class="history-date">${formattedDate} (${item.apiType} API)</div>
            `;
            
            historyItem.addEventListener('click', () => {
                // Set domain input value
                domainInput.value = item.domain;
                
                // Set API type radio button
                document.querySelector(`input[name="api"][value="${item.apiType}"]`).checked = true;
                
                // Display the stored result
                displayResult(item.domain, item.data, item.apiType);
            });
            
            historyList.appendChild(historyItem);
        });
    }
});
