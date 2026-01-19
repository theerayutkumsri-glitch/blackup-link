/**
 * Global Configuration for Meta Pixel, Domain Verification, and Event Tracking (20 Pages).
 * CONFIG_PAGES is loaded from config.json on GitHub (cached with v parameter).
 * Supports URL parameters: ?name=PageName&pixel=PixelID&dom=DomainVerification
 */

let CONFIG_PAGES = [];

/**
 * Fetch config from GitHub with cache busting
 */
async function loadConfig() {
    try {
        // Replace with your GitHub username and repo
        const configUrl = 'https://raw.githubusercontent.com/YOUR_USERNAME/blackup-link/main/config.json?v=' + new Date().getTime();
        const response = await fetch(configUrl);
        
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }
        
        const data = await response.json();
        CONFIG_PAGES = data.CONFIG_PAGES || [];
        
        console.log('Config loaded successfully from GitHub');
        applyURLParameters();
        injectMetaTags();
    } catch (error) {
        console.error('Error loading config:', error);
        console.warn('Falling back to inline config...');
        injectMetaTags();
    }
}

/**
 * Parse URL parameters and override CONFIG_PAGES if provided
 * Supported parameters: ?name=PageName&pixel=PixelID&dom=DomainVerification
 */
function applyURLParameters() {
    const params = new URLSearchParams(window.location.search);
    const nameParam = params.get('name');
    const pixelParam = params.get('pixel');
    const domParam = params.get('dom');
    
    // If URL parameters are provided, override the first config entry
    if (nameParam || pixelParam || domParam) {
        if (CONFIG_PAGES.length === 0) {
            CONFIG_PAGES.push({
                "key": "CUSTOM",
                "name": nameParam || "Custom Page",
                "pixelId": pixelParam || "",
                "domainVerification": domParam || "",
                "eventTracking": []
            });
        } else {
            const firstConfig = CONFIG_PAGES[0];
            if (nameParam) firstConfig.name = nameParam;
            if (pixelParam) firstConfig.pixelId = pixelParam;
            if (domParam) firstConfig.domainVerification = domParam;
        }
        
        console.log('URL Parameters applied:', { nameParam, pixelParam, domParam });
    }
}


/**
 * INJECTOR FUNCTION: Finds config based on data-config-key in body tag and injects Meta/FB Pixel.
 */
function injectMetaTags() {
    // 1. ตรวจสอบ Key ของหน้าเว็บไซต์ปัจจุบันจาก body tag
    const bodyConfigName = document.body.getAttribute('data-config-key');
    
    if (!bodyConfigName) {
        console.warn('Meta Config: Body attribute "data-config-key" not found. Cannot inject specific Pixel/Domain.');
        return;
    }

    // 2. ค้นหา Config ที่ถูกต้องจาก Array
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


// Automatically load config and call the injection function when the script loads
document.addEventListener('DOMContentLoaded', loadConfig);