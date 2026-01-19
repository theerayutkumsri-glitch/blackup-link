/**
 * Global Configuration for Meta Pixel, Domain Verification, and Event Tracking.
 * Config is loaded dynamically from config.json on GitHub
 * Support URL parameters: ?key=page1 or ?name=xxx&pixel=xxx&dom=xxx
 */

// GitHub Raw URL - Update YOUR_USERNAME with your GitHub username
const CONFIG_URL = 'https://raw.githubusercontent.com/theerayutkumsri-glitch/blackup-link/main/config.json';

let CONFIG_PAGES = [];

// Load config from GitHub
async function loadConfigFromGitHub() {
    try {
        // เพิ่ม cache buster เพื่อลบ cache
        const url = CONFIG_URL + '?t=' + new Date().getTime();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        CONFIG_PAGES = data.pages || [];
        console.log('Config loaded successfully:', CONFIG_PAGES.length, 'pages');
        return true;
    } catch (error) {
        console.error('Failed to load config from GitHub:', error);
        return false;
    }
}


/**
 * INJECTOR FUNCTION: Finds config based on URL params or body tag
 * Priority: URL params > body data-config-key > default
 */
async function injectMetaTags() {
    // 1. รอให้ config โหลดจาก GitHub
    const loaded = await loadConfigFromGitHub();
    if (!loaded) {
        console.error('Meta Config: Cannot load configuration from GitHub');
        return;
    }

    // 2. ดึง Config Key จาก URL params หรือ body tag
    const params = new URLSearchParams(window.location.search);
    let bodyConfigName = params.get('key') || document.body.getAttribute('data-config-key');
    
    if (!bodyConfigName) {
        console.warn('Meta Config: No "key" parameter or "data-config-key" attribute found. Cannot inject specific Pixel/Domain.');
        return;
    }

    // 3. ค้นหา Config ที่ถูกต้องจาก Array
    const pageConfig = CONFIG_PAGES.find(config => config.key === bodyConfigName);
    
    if (!pageConfig || !pageConfig.pixelId || !pageConfig.domainVerification) {
        console.error('Meta Config: Configuration not found or incomplete for key:', bodyConfigName);
        return;
    }

    const PIXEL_ID = pageConfig.pixelId;
    const DOMAIN_ID = pageConfig.domainVerification;
    
    // 3. Inject Domain Verification Meta Tag
    const domainMeta = document.createElement('meta');
    domainMeta.name = 'facebook-domain-verification';
    domainMeta.content = DOMAIN_ID;
    document.head.prepend(domainMeta);
    
    // 4. Inject Meta Pixel Base Code (Standard Setup)
    const pixelCode = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${PIXEL_ID}');
    fbq('track', 'PageView');
    `;
    
    const pixelScript = document.createElement('script');
    pixelScript.textContent = pixelCode;
    document.head.appendChild(pixelScript);
    
    // Inject noscript tag
    const noscriptDiv = document.createElement('noscript');
    noscriptDiv.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1" />`;
    document.head.appendChild(noscriptDiv);
    
    console.log(`Meta Config: Injected ID ${PIXEL_ID} for page key ${bodyConfigName} (${pageConfig.name})`);

    // 5. Attach Event Listeners
    attachEvents(pageConfig.eventTracking);
}

function attachEvents(eventTrackingConfig) {
    if (!eventTrackingConfig || eventTrackingConfig.length === 0) {
        return; 
    }
    
    // รอให้ DOM โหลดเสร็จก่อนแนบ Listener เพื่อให้แน่ใจว่าปุ่มมีอยู่จริง
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.fbq) {
             console.warn('FBQ not available for event attachment.');
             return;
        }
        
        eventTrackingConfig.forEach(config => {
            const element = document.querySelector(`[data-fb-event-id="${config.id}"]`);
            if (element) {
                element.addEventListener('click', (e) => {
                    config.events.forEach(event => {
                        window.fbq('track', event.name, event.params || {});
                        console.log('FB Event Tracked:', event.name, 'for ID:', config.id);
                    });
                });
            } else {
                console.warn('FB Event Config Warning: Element not found for ID:', config.id);
            }
        });
    });
}


// Automatically call the injection function when the script loads
injectMetaTags();