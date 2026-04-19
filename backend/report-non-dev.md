What We Found
3.8/10
Your server scored 3.8 out of 10 — it is running dangerously outdated software with known weaknesses, and it is missing several basic protections that every website should have in place.

The most urgent problem is that your website is running a version of its web server software that is over ten years old and has serious known flaws — some of which could allow an attacker to take full control of the server. On top of that, your site has no encrypted connection set up, meaning everything visitors send to and receive from your site travels in plain text across the internet. These two issues together make your server a straightforward target.

What We Checked
This was a passive scan, which means we examined only what is already publicly visible about your server — we did not make any direct attack connections to it. We checked public records about your domain name registration, looked up the software your website announces it is running, compared that software against a government database of known security flaws, and reviewed the basic security instructions your server sends to visitors' browsers. Think of it as standing on the street and observing what your building reveals about itself from the outside — without going through the front door.

What Hackers Could Do
Your Web Server Software Is a Decade Out of Date
What it is
Your website runs on Apache 2.4.7, a piece of software released in 2013 that is no longer supported or updated by its creators. Because it is so old, it has accumulated a long list of publicly documented security flaws that attackers know about and can attempt to use.

What an attacker could do
The most serious flaw in your version could allow an attacker to run any command they want on your server — giving them the ability to steal your data, plant malicious content on your website, or use your server to attack others. None of these attacks have been verified against your server specifically, but the flaws are real and the version you are running is confirmed to be affected.

Think of it this way
Running this version of your web server is like leaving your business secured with a lock that has been on the 'known defective' list for over ten years — anyone looking to break in knows exactly how it fails.

How to fix it
Contact whoever manages your server and ask them to upgrade Apache to version 2.4.62 or newer — this is the current supported release.
After upgrading, ask them to confirm the old version is fully removed and the new version is running.
Set a recurring reminder every three months to check that your server software is still on a supported version.
Your Website Has No Encrypted Connection
What it is
Your site does not have SSL certificate set up, which means all traffic between your visitors and your server is unencrypted. Anyone on the same network as one of your visitors — such as a coffee shop Wi-Fi — can read that traffic.

What an attacker could do
If visitors log in, fill out forms, or share any personal information on your site, that data is exposed in plain text as it travels across the internet. An attacker positioned between your visitor and your server can read, record, or even alter that information before it arrives.

Think of it this way
Sending information to your website right now is like mailing a postcard instead of a sealed envelope — anyone who handles it along the way can read what is written on it.

How to fix it
Ask your hosting provider or developer to install a free SSL certificate using a service called Let's Encrypt.
Once installed, make sure your site automatically redirects all visitors from the plain 'http://' address to the secure 'https://' address.
Confirm with your developer that the certificate is set to renew automatically before it expires.
Your Server Tells Attackers What Software It Is Running
What it is
Every time someone visits your website, your server automatically announces the exact name and version of the software it runs — in this case, 'Apache 2.4.7 on Ubuntu.' This information is handed out freely to anyone who asks, including attackers doing reconnaissance.

What an attacker could do
An attacker does not need to guess what flaws your server might have — your server tells them exactly which software to look up attack methods for. This turns what would be a guessing game into a targeted search.

Think of it this way
It is like a store putting a sign on the door that says exactly which brand and model of lock is on it — useful information for anyone planning to pick it.

How to fix it
Ask your developer to add a configuration setting that hides or obscures the server version information from public responses.
In Apache, this is done by setting 'ServerTokens Prod' and 'ServerSignature Off' in the configuration file.
Your Website Is Missing Seven Basic Browser Security Instructions
What it is
Modern websites send a set of security instructions to visitors' browsers telling them how to behave safely — for example, refusing to load your site inside another website's frame, or blocking certain types of malicious scripts. Your server is sending none of these instructions.

What an attacker could do
Without these protections, your visitors are more vulnerable to attacks that hijack your site's appearance to steal login credentials, inject malicious scripts into your pages, or trick visitors into taking actions they did not intend. These are well-known attack methods that these headers are specifically designed to prevent.

Think of it this way
It is like opening a shop without putting up any safety signage — the risks are known, the signs are free, and skipping them leaves everyone more exposed than they need to be.

How to fix it
Ask your developer to add the following security headers to your server's configuration: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and X-XSS-Protection.
Your developer can use the free tool at securityheaders.com to verify these are correctly configured after making changes.
A Flaw That Could Let Attackers Crash Your Server or Redirect Its Traffic
What it is
Your version of the web server software has a flaw where a specially crafted web address sent to it can cause it to crash or be tricked into sending web traffic somewhere it was not supposed to go. This flaw is documented publicly.

What an attacker could do
An attacker could send a single malformed request to your server and take it offline, making your website unreachable for your customers. In certain configurations, they could also redirect your server's internal traffic to unintended destinations.

Think of it this way
It is like a phone switchboard that crashes and goes dark whenever someone dials a specific wrong number — and that number is publicly posted online.

How to fix it
This flaw is fixed by upgrading to the current version of Apache — follow the upgrade steps listed in the first finding above, and this issue will be resolved at the same time.
A Flaw That Could Let Certain Users Run Unauthorized Code
What it is
Your version of the web server has a flaw that, under specific conditions, allows a user who can upload certain configuration files to your server to run scripts with permissions they should not have. This affects servers where users are given the ability to customize their own web directory settings.

What an attacker could do
If any user accounts on your server have the ability to upload files, one of them could exploit this to run unauthorized code on your server with elevated privileges — effectively doing things only an administrator should be able to do.

Think of it this way
It is like a building where tenants can slip a note under their door and it grants them keys to rooms they were never supposed to enter.

How to fix it
Again, upgrading Apache to the current version resolves this — follow the upgrade steps in the first finding.
Also ask your developer to review which user accounts have the ability to upload or modify configuration files on the server, and restrict that access to only those who absolutely need it.
What's Already Public
Before running any scan, we checked what public records already reveal about your server. Your domain name is registered through Dynadot LLC and is paid up through January 18, 2029, so there is no immediate risk of it expiring. Your domain's address records are managed through Linode's name servers — this is visible to anyone on the internet and is normal. No subdomains associated with your domain were found in public records, which means there are no forgotten or hidden web addresses attached to your domain that we could detect from the outside. The fact that your server openly broadcasts that it runs Apache 2.4.7 on Ubuntu means this information is also part of the public record — any attacker who looks up your site will immediately know what software to research for weaknesses.

Your Action List
1
Upgrade your web server software to Apache 2.4.62 or newer immediately — contact whoever manages your server and make this the first priority.
The version you are running has serious documented flaws that could let an attacker take full control of your server.
2
Install an SSL certificate and enable encrypted connections on your website so that all traffic runs over 'https://' instead of 'http://'.
Without this, everything your visitors send to your site — including any personal information or login details — travels in plain text across the internet.
3
Configure your server to hide its software name and version number from public responses.
Advertising exactly what software you run makes it trivially easy for attackers to find and target the right weaknesses.
4
Add the seven missing browser security headers to your server configuration: Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and X-XSS-Protection.
Without these, your visitors are exposed to common attacks that these headers are specifically designed to block.
5
After upgrading your server software, ask your developer to verify that the old version is fully removed and no legacy configuration files remain.
Leftover old configuration files can reintroduce vulnerabilities even after a software upgrade.
6
Review which user accounts on your server can upload or modify files, and remove that access from anyone who does not need it.
A flaw in your current server version could allow someone with file-upload access to run unauthorized code with administrator-level permissions.
7
Set a recurring reminder every three months to check that your server software is still on a supported, up-to-date version.
Software goes out of date continuously — a check you do once today will not protect you a year from now.