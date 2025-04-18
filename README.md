﻿# domainlookup
This Domain Search Application enables users to check domain name details with real-time results. It features both internal and external API integrations and uses caching and local storage for better performance and user experience.

Dual API Support: Users can choose between an external WHOIS XML API or an internal PHP-based backend for domain lookup.
Domain Validation: Ensures users input a valid domain name format before sending the request.
Internal API Backend: Written in PHP, the backend uses native DNS and WHOIS functions to retrieve domain data such as IP address, DNS records, and WHOIS information.
Caching Mechanism: The internal API includes a file-based caching system to reduce load time and server requests for recently searched domains (valid for 1 hour).
DNS Record Support: Displays various DNS records (A, MX, NS, SOA, TXT) and highlights name servers specifically.
WHOIS Lookup: Attempts to fetch raw WHOIS information using socket connections to TLD-specific WHOIS servers.
External API Integration: Uses the WHOIS XML API service for more detailed domain ownership and registration data.
Search History: Stores up to 10 recent searches using browser local storage for quick access and offline reference.
Clickable History: Users can click a previous search from history to re-display the result instantly, including which API was used.
Responsive UI: Clean and minimal frontend interface with real-time feedback, loading indicator, and user-friendly error messages.
