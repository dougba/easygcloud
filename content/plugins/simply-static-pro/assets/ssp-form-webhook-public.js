(function () {
    'use strict';
    if (window.__SSP_WEBHOOK_INIT__) { return; }
    window.__SSP_WEBHOOK_INIT__ = true;

    // Detect static environment early (before DOM may be fully loaded)
    const isStaticSite = () => !!document.querySelector("meta[name='ssp-config-path']") || window.location.pathname.indexOf('/static/') !== -1;

    // Fetch API interception: CF7 5.6+ and other modern form plugins use window.fetch
    // to submit to WP REST API endpoints (e.g., /wp-json/contact-form-7/v1/contact-forms/{id}/feedback).
    // On static sites these endpoints don't exist and return 404. We intercept and return
    // a fake success response so the plugin's JS completes normally, while SSP's own submit
    // handler (bound in initForms) sends the actual data to the configured webhook.
    if (!window.__SSP_FETCH_OVERRIDDEN__) {
        window.__SSP_FETCH_OVERRIDDEN__ = true;
        const _origFetch = window.fetch;

        window.fetch = function (resource, init) {
            if (!isStaticSite()) { return _origFetch.apply(this, arguments); }

            const url = (typeof resource === 'string') ? resource : (resource && resource.url ? resource.url : '');
            const method = (init && init.method) ? init.method.toUpperCase() : 'GET';

            // Intercept CF7 feedback submissions: POST to .../contact-form-7/v1/contact-forms/{id}/feedback
            var cf7Match = method === 'POST' && url.match(/contact-form-7\/v1\/contact-forms\/(\d+)\/feedback/);
            if (cf7Match) {
                var formId = cf7Match[1];
                var fakeBody = JSON.stringify({
                    status: 'mail_sent',
                    message: 'Thank you for your message. It has been sent.',
                    posted_data_hash: '',
                    into: '#',
                    invalid_fields: []
                });
                return Promise.resolve(new Response(fakeBody, {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            // Intercept CF7 refill requests (GET after successful submission) to avoid 404s.
            var cf7Refill = url.match(/contact-form-7\/v1\/contact-forms\/(\d+)\/refill/);
            if (cf7Refill) {
                return Promise.resolve(new Response(JSON.stringify({}), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }

            return _origFetch.apply(this, arguments);
        };
    }

    // XHR-level interception: This is the lowest-level AJAX primitive and cannot
    // be bypassed by cached jQuery references, jquery-migrate wrappers, or Backbone.
    // Ninja Forms goes through: front-end.js → Backbone → jquery-migrate → $.ajax → XHR
    // Even if $.ajax override fails due to cached closures, this always catches the request.
    if (!window.__SSP_XHR_OVERRIDDEN__) {
        window.__SSP_XHR_OVERRIDDEN__ = true;
        const _origOpen = XMLHttpRequest.prototype.open;
        const _origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
            this.__sspUrl = (typeof url === 'string') ? url : String(url || '');
            this.__sspMethod = method;
            return _origOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            if (!isStaticSite()) { return _origSend.apply(this, arguments); }

            const url = this.__sspUrl || '';
            const isAdminAjax = url.toLowerCase().indexOf('admin-ajax.php') !== -1;

            if (isAdminAjax) {
                // Parse body to check for Ninja Forms submission
                let isNinjaSubmit = false;
                let nfFormId = null;
                let bodyStr = '';
                if (typeof body === 'string') {
                    bodyStr = body;
                } else if (body instanceof FormData) {
                    // FormData: check for nf_ajax_submit action
                    try { if (body.get('action') === 'nf_ajax_submit') { isNinjaSubmit = true; } } catch (e) {}
                    try { var fd = body.get('formData'); if (fd) { var p = JSON.parse(fd); nfFormId = p.id; } } catch (e) {}
                }
                if (bodyStr.indexOf('nf_ajax_submit') !== -1) { isNinjaSubmit = true; }
                if (!nfFormId && bodyStr.indexOf('formData') !== -1) {
                    try {
                        var params = new URLSearchParams(bodyStr);
                        var fdStr = params.get('formData');
                        if (fdStr) { var parsed = JSON.parse(fdStr); nfFormId = parsed.id; }
                    } catch (e) {}
                }

                if (isNinjaSubmit && nfFormId) {
                    var formEl = document.querySelector('#nf-form-' + nfFormId + '-cont form') ||
                        document.querySelector('.nf-form-cont form') ||
                        document.querySelector('.ninja-forms-form-wrap form');
                    if (formEl && window.__SSP_MANAGE_FORM__) {
                        window.__SSP_MANAGE_FORM__([nfFormId, 'nf-form-' + nfFormId + '-cont'], formEl);
                    }
                }

                // Block the XHR request entirely — fire error/load events so callers don't hang
                var self = this;
                setTimeout(function () {
                    var fakeResponse = '{"success":true,"data":{"message":"","data":[]}}';
                    Object.defineProperty(self, 'status', { get: function () { return 200; } });
                    Object.defineProperty(self, 'readyState', { get: function () { return 4; } });
                    Object.defineProperty(self, 'responseText', { get: function () { return fakeResponse; } });
                    Object.defineProperty(self, 'response', { get: function () { return fakeResponse; } });
                    if (typeof self.onreadystatechange === 'function') { self.onreadystatechange(new Event('readystatechange')); }
                    if (typeof self.onload === 'function') { self.onload(new Event('load')); }
                    self.dispatchEvent(new Event('readystatechange'));
                    self.dispatchEvent(new Event('load'));
                    self.dispatchEvent(new Event('loadend'));
                }, 0);
                return; // Do NOT call _origSend
            }

            return _origSend.apply(this, arguments);
        };
    }

    // Get options from JSON file.
    var form_config_element = document.querySelector("meta[name='ssp-config-path']");
    var config_path = form_config_element ? form_config_element.getAttribute("content") : '/wp-content/uploads/simply-static/configs/';
    var version_element = document.querySelector("meta[name='ssp-config-version']");
    var version_suffix = '';
    if (version_element) {
        let v = version_element.getAttribute('content');
        if (v) { version_suffix = '?ver=' + encodeURIComponent(v); }
    }
    var config_url = window.location.origin + config_path + 'forms.json' + version_suffix;

    function handleMessage(settings, error = false, formEl) {
        var notice = document.createElement('div');
        notice.className = 'ssp-form-response';
        notice.setAttribute('role', 'alert');
        notice.style.cssText = 'width:100%;max-width:100%;margin:0;';

        var message = document.createElement('div');
        message.className = error ? 'ssp-form-message ssp-error' : 'ssp-form-message ssp-success';
        message.style.cssText = 'width:100%;background:' + (error ? '#e24b4b' : '#58b348') + ';color:#fff;text-align:center;padding:10px;border-radius:3px;';
        var successText = settings && settings.form_success_message ? settings.form_success_message : 'Thanks! Your message has been sent.';
        var errorText = settings && settings.form_error_message ? settings.form_error_message : 'Sorry, something went wrong. Please try again.';
        message.innerHTML = error ? errorText : successText;
        notice.appendChild(message);

        var target = null;
        if (settings && settings.form_id) {
            try { target = document.getElementById(String(settings.form_id)); } catch (e) { }
        }
        if (!target && formEl) { target = formEl; }
        if (!target) { document.body.appendChild(notice); return; }

        if (!error) {
            try { target.style.display = 'none'; } catch (e) { }
            if (target.parentNode) {
                if (target.nextSibling) { target.parentNode.insertBefore(notice, target.nextSibling); }
                else { target.parentNode.appendChild(notice); }
            } else { document.body.appendChild(notice); }
        } else {
            if (target.parentNode) { target.parentNode.insertBefore(notice, target); }
            else { document.body.appendChild(notice); }
        }
    }

    function submitForm(url, settings, data, formEl) {
        let requestData = { method: "POST", body: data, redirect: 'manual', mode: 'cors', credentials: 'omit' };
        let mergedHeaders = new Headers();
        if (settings.form_custom_headers) {
            settings.form_custom_headers.split(',').forEach(header => {
                if (!header) return;
                let parts = header.split(':');
                if (parts.length >= 2) {
                    let name = parts[0].trim();
                    let value = parts.slice(1).join(':').trim();
                    if (name) mergedHeaders.set(name, value);
                }
            });
        }
        if (!mergedHeaders.has('Accept')) { mergedHeaders.set('Accept', 'application/json'); }
        requestData.headers = mergedHeaders;

        fetch(url, requestData).then(response => {
            const isRedirectLike = response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400);
            if (response.ok || isRedirectLike) { handleMessage(settings, false, formEl); }
            else { handleMessage(settings, true, formEl); }
        }).catch(error => { handleMessage(settings, true, formEl); });
    }

    var __SSP_FORMS_CONFIG__ = null;
    function manageForm(candidateIds, form) {
        const ids = Array.isArray(candidateIds) ? candidateIds.filter(Boolean) : [candidateIds].filter(Boolean);
        const loadConfig = __SSP_FORMS_CONFIG__ ? Promise.resolve(__SSP_FORMS_CONFIG__) : fetch(config_url)
            .then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(json => { __SSP_FORMS_CONFIG__ = json; return json; });

        loadConfig.then(json => {
            let settings = null;
            if (Array.isArray(json)) {
                const norm = (v) => (v == null ? '' : String(v).trim());
                const stripHash = (v) => norm(v).replace(/^#/, '');
                const cf7Num = (v) => { const s = norm(v), m = s.match(/wpcf7-f(\d+)-p/); return m ? m[1] : (/^\d+$/.test(s) ? s : ''); };
                const gfNum = (v) => { const s = norm(v), m = s.match(/gform(?:_wrapper)?_(\d+)/i); return m ? m[1] : (/^\d+$/.test(s) ? s : ''); };
                const foNum = (v) => { const s = norm(v), m = s.match(/forminator-(?:form|module)-(\d+)/i); return m ? m[1] : (/^\d+$/.test(s) ? s : ''); };
                const nfNum = (v) => { const s = norm(v), m = s.match(/nf-form-(\d+)-cont/); return m ? m[1] : (/^\d+$/.test(s) ? s : ''); };

                try {
                    json.forEach(cfg => {
                        if (!cfg || !cfg.form_hidden_name) return;
                        var inp = form.querySelector('input[name="' + cfg.form_hidden_name + '"]');
                        if (inp && inp.value) { ids.push(inp.value); }
                    });
                } catch (e) { }

                const normCandidates = [];
                ids.forEach(cid => {
                    const a = norm(cid), b = stripHash(cid), nCf7 = cf7Num(cid), nGf = gfNum(cid), nFo = foNum(cid), nNf = nfNum(cid);
                    [a, b, nCf7, nGf, nFo, nNf].forEach(v => { if (v && normCandidates.indexOf(v) === -1) normCandidates.push(v); });
                });

                settings = json.find(x => {
                    const sidRaw = x && x.form_id, sid = stripHash(sidRaw), sCf7 = cf7Num(sidRaw), sGf = gfNum(sidRaw), sFo = foNum(sidRaw), sNf = nfNum(sidRaw);
                    return normCandidates.some(c => {
                        const cc = stripHash(c);
                        return sid === cc || (sid && cc && (sid.indexOf(cc) !== -1 || cc.indexOf(sid) !== -1)) ||
                            (sCf7 && cf7Num(cc) === sCf7) || (sGf && gfNum(cc) === sGf) || (sFo && foNum(cc) === sFo) || (sNf && nfNum(cc) === sNf);
                    });
                });
            }

            if (settings) {
                let data = new FormData(form);
                if (!data.has('nf_form_id')) {
                    var nfWrap = form.closest('.ninja-forms-form-wrap') || form.closest('.nf-form-cont');
                    if (nfWrap && nfWrap.id) {
                        var m = nfWrap.id.match(/nf-form-(\d+)-cont/);
                        if (m && m[1]) { data.set('nf_form_id', m[1]); }
                    }
                }
                var hasTurnstile = !!(form.querySelector('.cf-turnstile') || (form.closest('.nf-form-cont') && form.closest('.nf-form-cont').querySelector('.cf-turnstile')));
                var recaptchaInput = form.querySelector('input.g-recaptcha-response[data-sitekey]') || (form.closest('.nf-form-cont') && form.closest('.nf-form-cont').querySelector('input.g-recaptcha-response[data-sitekey]'));
                var hasRecaptcha = !!recaptchaInput;
                var restBase = (settings.rest_base && typeof settings.rest_base === 'string') ? settings.rest_base : '';
                if (restBase && restBase.slice(-1) !== '/') { restBase += '/'; }
                var targetUrl = settings.form_webhook;

                if (hasTurnstile && restBase && targetUrl) {
                    if (!data.has('cf-turnstile-response')) {
                        var tsInp = form.querySelector('input[name="cf-turnstile-response"]') || (form.closest('.nf-form-cont') && form.closest('.nf-form-cont').querySelector('input[name="cf-turnstile-response"]'));
                        if (tsInp && tsInp.value) { data.set('cf-turnstile-response', tsInp.value); }
                    }
                    submitForm(restBase + 'simplystatic/v1/turnstile/submit?forward_to=' + encodeURIComponent(targetUrl), settings, data, form);
                } else if (hasRecaptcha && restBase && targetUrl && typeof grecaptcha !== 'undefined') {
                    grecaptcha.ready(function () {
                        grecaptcha.execute(recaptchaInput.getAttribute('data-sitekey'), { action: 'submit' }).then(token => {
                            data.set('g-recaptcha-response', token);
                            submitForm(restBase + 'simplystatic/v1/recaptcha/submit?forward_to=' + encodeURIComponent(targetUrl), settings, data, form);
                        }).catch(() => handleMessage(settings, true, form));
                    });
                } else {
                    submitForm(targetUrl, settings, data, form);
                }
            } else {
                handleMessage({ form_success_message: 'Form submitted (fallback).', form_error_message: 'Mapping error.' }, true, form);
            }
        }).catch(e => console.error('[SSP] Config error', e));
    }
    window.__SSP_MANAGE_FORM__ = manageForm;

    function initForms() {
        const allFormRoots = document.querySelectorAll(".wpcf7 form, .wpcf7-form, .gform_wrapper form, .gform_wrapper, .wpforms-container form, .elementor-form, .wsf-form form, .ws-form form, .frm-fluent-form, .brxe-form, .brxe-brf-pro-forms, .wp-block-kadence-form form, .forminator-custom-form, .ninja-forms-form-wrap form, .nf-form-cont form, .ninja-forms-form-wrap, .nf-form-cont");
        const isStatic = !!document.querySelector("meta[name='ssp-config-path']") || window.location.pathname.includes('/static/');

        allFormRoots.forEach((root) => {
            let form = (root.tagName === 'FORM') ? root : root.querySelector('form');
            if (!form || form.dataset.sspBound === '1') return;
            form.dataset.sspBound = '1';

            form.removeAttribute("action"); form.removeAttribute("method"); form.removeAttribute("enctype"); form.removeAttribute("target");
            form.querySelectorAll("input, textarea, select").forEach(el => { if (el.getAttribute("aria-required") === "true") el.required = true; });

            if (isStatic) {
                const interceptClick = (ev) => { ev.stopImmediatePropagation(); ev.preventDefault(); form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); };
                if (form.classList.contains('frm-fluent-form') || form.classList.contains('wpforms-form') || form.classList.contains('forminator-custom-form') || form.closest('.gform_wrapper') || form.closest('.wp-block-kadence-form') || form.closest('.wsf-form') || form.closest('.ws-form')) {
                    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach(btn => {
                        if (btn.onclick) btn.onclick = null;
                        btn.addEventListener('click', interceptClick, true);
                    });
                    if (form.closest('.gform_wrapper')) { form.onsubmit = () => false; }
                }
            }

            form.addEventListener("submit", function (ev) {
                if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;
                if (form.querySelector('.ssp-field-error')) return;
                ev.preventDefault(); ev.stopImmediatePropagation();
                let candidates = [form.id];
                if (form.closest('.wpcf7')) candidates.push(form.closest('.wpcf7').id, form.querySelector('input[name="_wpcf7_unit_tag"]')?.value, form.querySelector('input[name="_wpcf7"]')?.value);
                if (form.querySelector('input[name="wpforms[id]"]')) candidates.push(form.querySelector('input[name="wpforms[id]"]').value);
                if (form.querySelector('input[name="wsf_form_id"]')) candidates.push(form.querySelector('input[name="wsf_form_id"]').value);
                if (form.querySelector('input[name="gform_submit"]')) candidates.push(form.querySelector('input[name="gform_submit"]').value);
                if (form.querySelector('input[name="_fluentform_id"]')) candidates.push(form.querySelector('input[name="_fluentform_id"]').value);
                if (form.querySelector('input[name="form_id"]')) candidates.push(form.querySelector('input[name="form_id"]').value);
                if (form.querySelector('input[name="_kb_form_id"]')) candidates.push(form.querySelector('input[name="_kb_form_id"]').value);
                if (form.closest('.nf-form-cont')) {
                    const nfId = form.closest('.nf-form-cont').id;
                    candidates.push(nfId, nfId.match(/nf-form-(\d+)-cont/)?.[1]);
                }
                manageForm(candidates, form);
            }, false);
        });
    }

    const runAll = () => {
        if (window.__SSP_WEBHOOK_RUNNING__) return;
        window.__SSP_WEBHOOK_RUNNING__ = true;
        initForms();
        if (typeof MutationObserver !== 'undefined') {
            new MutationObserver(() => initForms()).observe(document.body, { childList: true, subtree: true });
        }
        // Ninja Forms renders via Backbone after DOMContentLoaded; re-bind when its forms are ready.
        document.addEventListener('nfFormReady', () => initForms());
    };

    if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", runAll); }
    else { runAll(); }
})();
