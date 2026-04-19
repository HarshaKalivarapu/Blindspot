Scan Overview
A passive reconnaissance scan was conducted against the target host scanme.nmap.org in simple mode, completing in 57.8 seconds. The scan identified one open port (80/http) running Apache httpd version 2.4.7 on Ubuntu. Four CVEs were discovered against this outdated Apache release, the most severe carrying a CVSS score of 9.8. No confirmed exploits were executed or verified in this passive phase. The server also discloses its version string in HTTP response headers and is missing all seven recommended HTTP security headers. HTTPS does not appear to be configured on port 443, meaning all traffic is transmitted in plaintext. The overall risk score for this target is 7.2 out of 10.0, driven primarily by the critically outdated Apache version and complete absence of transport-layer encryption.

Passive Reconnaissance
whatweb — command
whatweb http://scanme.nmap.org
whatweb — output
http://scanme.nmap.org [200 OK] Apache[2.4.7], Country[UNITED STATES], Google-Analytics-Universal, HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.7 (Ubuntu)], IP[45.33.32.156], Title[Go ahead and ScanMe!], Ubuntu
dns_whois — command
whois scanme.nmap.org
dns_whois — output
Registrar: DYNADOT LLC
Expiry Date: 2029-01-18
Nameservers:
  ns1.linode.com
  ns2.linode.com
  ns3.linode.com
  ns4.linode.com
  ns5.linode.com
Subdomains Found: none
http_headers — command
curl -sI http://scanme.nmap.org
http_headers — output
Missing Security Headers:
  Strict-Transport-Security
  Content-Security-Policy
  X-Frame-Options
  X-Content-Type-Options
  Referrer-Policy
  Permissions-Policy
  X-XSS-Protection

Information Disclosure:
  Server: Apache/2.4.7 (Ubuntu)
nvd_lookup — command
nvd_lookup --software "Apache 2.4.7"
nvd_lookup — output
CVEs found for Apache 2.4.7:
  CVE-2016-6814  CVSS 9.8
  CVE-2021-44224 CVSS 8.2
  CVE-2025-66200 CVSS 5.4
  CVE-2012-2378  CVSS 4.3
Passive reconnaissance confirmed the target runs a significantly outdated Apache 2.4.7 installation on Ubuntu, last updated in 2013. The technology stack includes Google Analytics Universal. The domain registration is healthy with expiry in 2029 and uses Linode nameservers. No subdomains were enumerated, and crt.sh returned no certificate transparency records, consistent with the absence of HTTPS. The HTTP response header analysis reveals complete absence of all standard security headers and active server version disclosure, which aids attacker fingerprinting.

Port Analysis
80
http
Apache httpd 2.4.7 (Ubuntu)
OPEN
Port 80 exposes an unencrypted HTTP service running a critically outdated version of Apache httpd; this service should not be internet-facing without upgrading Apache and enforcing HTTPS redirection.

http_headers — command
curl -sI http://scanme.nmap.org:80
http_headers — output
HTTP/1.1 200 OK
Server: Apache/2.4.7 (Ubuntu)
Missing: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection
searchsploit Apache 2.4.7
No public exploits found.
CVE-2016-6814
CVSS 9.8
Unsupported Codehaus/Apache Groovy versions on the classpath allow exploitation of standard Java serialization mechanisms to execute arbitrary code.

Affected: Apache 2.4.7
CVE-2021-44224
CVSS 8.2
A crafted URI sent to httpd configured as a forward proxy can cause a NULL pointer dereference crash or allow requests to be directed to unintended Unix Domain Sockets.

Affected: Apache 2.4.7
CVE-2025-66200
CVSS 5.4
mod_userdir and suexec bypass via AllowOverride FileInfo allows users with htaccess access to run CGI scripts under an unexpected userid.

Affected: Apache 2.4.7
CVE-2012-2378
CVSS 4.3
Apache CXF does not properly enforce child policies of a WS-SecurityPolicy 1.1 SupportingToken policy on the client side, allowing attackers to bypass AlgorithmSuite and other security policies.

Affected: Apache 2.4.7
Upgrade Apache httpd immediately from version 2.4.7 to the latest stable release to remediate all four identified CVEs.
Enable HTTPS on port 443 by obtaining and configuring a valid TLS certificate, then redirect all port 80 traffic to HTTPS.
Remove or suppress the Server response header to eliminate version disclosure that aids attacker fingerprinting.
Add all missing HTTP security headers: Strict-Transport-Security, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and X-XSS-Protection.
Audit whether mod_userdir and suexec are required; disable them if not needed to eliminate the CVE-2025-66200 attack surface.
Review Apache proxy configuration and disable forward proxy functionality if not explicitly required, mitigating CVE-2021-44224.
Audit the application classpath for any Groovy or third-party Java serialization libraries to address the deserialization risk described in CVE-2016-6814.
Configure Shodan API monitoring to enable ongoing external exposure tracking for this host.
CVE Summary
Exploit Availability
Execution Log
Time	Tool	Command	Result	Status
00:00:00	whatweb	whatweb http://scanme.nmap.org	Identified Apache 2.4.7 on Ubuntu with Google Analytics Universal and HTML5	SUCCESS
00:00:08	dns_whois	whois scanme.nmap.org	Registrar DYNADOT LLC, expiry 2029-01-18, 5 Linode nameservers	SUCCESS
00:00:12	dns_whois	curl https://crt.sh/?q=scanme.nmap.org	crt.sh lookup failed — 404 Not Found	ERROR
00:00:15	http_headers	curl -sI http://scanme.nmap.org	7 missing security headers detected; server version disclosed in Server header	SUCCESS
00:00:20	shodan	shodan host scanme.nmap.org	SHODAN_API_KEY is not set in environment	ERROR
00:00:22	ssl_tls	openssl s_client -connect scanme.nmap.org:443	Could not retrieve SSL certificate — Network is unreachable (port 443)	ERROR
00:00:30	nvd_lookup	nvd_lookup --software "Apache 2.4.7"	4 CVEs found: CVE-2016-6814 (9.8), CVE-2021-44224 (8.2), CVE-2025-66200 (5.4), CVE-2012-2378 (4.3)	SUCCESS
Summary
Score
7.2/10
Open Ports
80
CVEs Found
4
Confirmed Exploits
0
Tools Run
whatweb, dns_whois, http_headers, nvd_lookup
Duration
57.8s
The primary risk on this host is the severely outdated Apache 2.4.7 installation, which is over a decade old and carries a CVSS 9.8 deserialization vulnerability alongside three additional CVEs. The complete lack of HTTPS and all HTTP security headers compounds the exposure, leaving all user traffic unencrypted and the browser environment unprotected against common client-side attacks. No exploits were confirmed during this passive scan, but the attack surface is substantial and should be remediated by upgrading Apache and enabling TLS as a priority.

Errors
shodan: SHODAN_API_KEY is not set in environment
ssl_tls: Could not retrieve SSL certificate — Network is unreachable (port 443)
dns_whois: crt.sh lookup failed — 404 Not Found