<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Check if domain parameter is provided
if (!isset($_GET['domain'])) {
    echo json_encode(['error' => 'Domain parameter is required']);
    exit;
}

$domain = $_GET['domain'];

// Simple domain validation
if (!preg_match('/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/', $domain)) {
    echo json_encode(['error' => 'Invalid domain format']);
    exit;
}

/**
 * Simple file-based cache implementation
 */
class SimpleCache {
    private $cacheDir;
    private $cacheDuration = 3600; // 1 hour in seconds
    
    public function __construct($cacheDir = 'cache') {
        $this->cacheDir = $cacheDir;
        // Create cache directory if it doesn't exist
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0777, true);
        }
    }
    
    /**
     * Get cache key for a domain
     */
    private function getCacheKey($domain) {
        return $this->cacheDir . '/' . md5($domain) . '.json';
    }
    
    /**
     * Check if cache exists and is still valid
     */
    public function exists($domain) {
        $cacheFile = $this->getCacheKey($domain);
        
        if (file_exists($cacheFile)) {
            $fileTime = filemtime($cacheFile);
            $now = time();
            
            // Check if the cache is still valid (less than cacheDuration)
            if (($now - $fileTime) < $this->cacheDuration) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Get cached data
     */
    public function get($domain) {
        $cacheFile = $this->getCacheKey($domain);
        
        if ($this->exists($domain)) {
            $content = file_get_contents($cacheFile);
            return json_decode($content, true);
        }
        
        return null;
    }
    
    /**
     * Save data to cache
     */
    public function set($domain, $data) {
        $cacheFile = $this->getCacheKey($domain);
        $content = json_encode($data);
        file_put_contents($cacheFile, $content);
    }
}

/**
 * Get domain information using native PHP functions
 * @param string $domain Domain to look up
 * @return array Domain information
 */
function getDomainInfo($domain) {
    $result = [
        'domainName' => $domain,
        'ip' => null,
        'nameservers' => [],
        'dns' => [],
    ];
    
    // Get IP address
    $ip = gethostbyname($domain);
    if ($ip !== $domain) {
        $result['ip'] = $ip;
    }
    
    // Get DNS records
    $dnsTypes = ['A', 'MX', 'NS', 'SOA', 'TXT'];
    foreach ($dnsTypes as $type) {
        $records = dns_get_record($domain, constant("DNS_$type"));
        if ($records) {
            $result['dns'][$type] = $records;
            
            // Extract nameservers
            if ($type === 'NS') {
                foreach ($records as $record) {
                    if (isset($record['target'])) {
                        $result['nameservers'][] = $record['target'];
                    }
                }
            }
        }
    }
    // Try to get WHOIS information
    $whois = getWhoisInfo($domain);
    if ($whois) {
        $result['whois'] = $whois;
    }
    
    return $result;
}

/**
 * Get WHOIS information for a domain
 * @param string $domain Domain to look up
 * @return string|null WHOIS information or null if not available
 */
function getWhoisInfo($domain) {
    // Get TLD from domain
    $parts = explode('.', $domain);
    $tld = end($parts);
    
    // WHOIS servers for common TLDs
    $whoisServers = [
        'com' => 'whois.verisign-grs.com',
        'net' => 'whois.verisign-grs.com',
        'org' => 'whois.pir.org',
        'info' => 'whois.afilias.net',
        'biz' => 'whois.biz',
        'io' => 'whois.nic.io'
    ];
    
    $server = isset($whoisServers[$tld]) ? $whoisServers[$tld] : null;
    
    if (!$server) {
        return null;
    }
    
    // Try to connect to the WHOIS server
    $sock = @fsockopen($server, 43, $errno, $errstr, 10);
    if (!$sock) {
        return null;
    }
    
    // Send the domain name to the WHOIS server
    fputs($sock, $domain . "\r\n");
    
    // Read the response
    $response = '';
    while (!feof($sock)) {
        $response .= fgets($sock, 1024);
    }
    fclose($sock);
    
    return $response;
}

// Initialize cache
$cache = new SimpleCache();

// Check if the domain info is in cache
if ($cache->exists($domain)) {
    // Get from cache and add a flag to indicate it's cached
    $domainInfo = $cache->get($domain);
    $domainInfo['cached'] = true;
} else {
    // Get domain information
    $domainInfo = getDomainInfo($domain);
    
    // Store in cache
    $cache->set($domain, $domainInfo);
    
    // Add a flag to indicate it's not cached
    $domainInfo['cached'] = false;
}

// Output the result as JSON
echo json_encode($domainInfo);
?>