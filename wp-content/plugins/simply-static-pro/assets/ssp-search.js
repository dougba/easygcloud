'use strict';

const searchResults = [];


// Helper: render excerpt conditionally based on localized flag and presence
function renderExcerpt(item) {
    try {
        if (window.ssp_search && ssp_search.show_excerpt && item && item.excerpt) {
            return `<small>${item.excerpt}</small>`;
        }
    } catch (_) {}
    return '';
}


// Get index from JSON file.
let fuse_config_element = document.querySelector("meta[name='ssp-config-path']");

if (null !== fuse_config_element) {
    let config_path = fuse_config_element.getAttribute("content");
    let version_element = document.querySelector("meta[name='ssp-config-version']");
    let version_suffix = '';
    if (null !== version_element) {
        let v = version_element.getAttribute('content');
        if (v) {
            version_suffix = '?ver=' + encodeURIComponent(v);
        }
    }
    let index_url = window.location.origin + config_path + 'fuse-index.json' + version_suffix;
    let config_url = window.location.origin + config_path + 'fuse-config.json' + version_suffix;
    let index;
    let config;

    // Multilingual?
    let language = document.documentElement.lang.substring(0, 2);
    let is_multilingual = false;

    if (document.getElementsByTagName("link").length) {
        let links = document.getElementsByTagName("link");

        for (const link of links) {
            let language_tag = link.getAttribute("hreflang");

            if ('' !== language_tag && null !== language_tag) {
                is_multilingual = true;
            }
        }
    }


    async function loadConfig(callback) {

        try {
            const response = await fetch(config_url, {
                headers: {
                    "Content-Type": "application/json",
                }
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json = await response.text();
            callback(json);

        } catch (error) {
            console.error(error.message);
        }


    }

    async function loadIndex(callback) {
        try {
            const response = await fetch(index_url, {
                headers: {
                    "Content-Type": "application/json",
                }
            });
            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const json = await response.text();
            callback(json);

        } catch (error) {
            console.error(error.message);
        }

    }

    loadIndex(function (response) {
        let json = JSON.parse(response);
        const index = Object.values(json);

        // Build search index for Fuse.
        for (const value of index) {
            var result = {
                url: window.location.origin + value.path,
                title: value.title,
                excerpt: value.excerpt,
                content: value.content,
                language: value.language
            };

            if (is_multilingual) {
                if (result.language === language) {
                    searchResults.push(result);
                }
            } else {
                searchResults.push(result);
            }
        }

        if (null !== fuse) {
            fuse.setCollection(searchResults);
        }
    });

// Search.

    let keys = ['title', 'content', 'excerpt', 'language'];
    let fuse = null;

    loadConfig(function (response) {
        config = JSON.parse(response);

        fuse = new Fuse(
            searchResults,
            {
                keys: keys,
                shouldSort: true,
                threshold: config.threshold ? config.threshold : 0.1,
                maxPatternLength: 50
            }
        );

        // Notify page helpers that Fuse is ready
        try {
            window.dispatchEvent(new CustomEvent('ssp:fuse-ready'));
        } catch (_) {
        }
        // Build selector-based instances (non search-page specific)
        try {
            maybeBuildSearch();
        } catch (_) {
        }
    });

    window.FuseSearchForm = function FuseSearchForm(el) {
        var self = this;
        let input = '';
        let results = [];
        let selected = -1;
        let showAutoComplete = false;
        let container = el;
        let searchFormNode = null;
        let searchInputNode = null;
        let autoCompleteNode = null;
        let resultNode = null;
        // Determine per-instance autocomplete allowance: always enabled now
        const allowAutoComplete = function() { return true; };

        this.handleSearchSubmit = function handleSearchSubmit(event) {
            if (event) {
                event.preventDefault()
            }


            input = searchInputNode.value.trim()
            selected = -1

            // Always compute results on submit so the results list can render
            if (input.length >= 3 && fuse) {
                results = fuse.search(input).slice(0, 7)
            }

            // Ensure autocomplete dropdown is (re)shown on submit
            showAutoComplete = true
            document.activeElement.blur()
            autoCompleteNode.innerHTML = self.renderAutoComplete()

            if (input.length > 2) {
                if (results.length) {
                    resultNode.innerHTML = `
                <div class="ssp-results"><h5>Searched for: <b>${input}</b></h5>
                <ul>
                  ${results.map((result, index) => `
                  <a href="${result.item.url}">
                    <li class='auto-complete-item${index === selected ? ' selected' : ''}'>
                      ${result.item.title}</br>
                        ${renderExcerpt(result.item)}
                    </li>
                  </a>
                `).join('')}
                </ul></div>`
                } else {
                    resultNode.innerHTML = `
            <div class="ssp-results">
            <h5>Searched for: <b>${input}</b></h5>
            <ul>
            <li>We couldn't find any matching results.</li>
            </ul>
            </div>`
                }
            } else {
                resultNode.innerHTML = '';
            }
        }

        this.renderAutoComplete = function renderAutoComplete() {
            if (!showAutoComplete || input.length < 3 || results.length === 0) {
                autoCompleteNode.classList.remove('show')
                return ''
            } else {
                autoCompleteNode.classList.add('show')
            }
            return `
                <ul>
                  ${results.map((result, index) => `
                  <a href="${result.item.url}">
                    <li class='auto-complete-item${index === selected ? ' selected' : ''}'>
                      ${result.item.title}</br>
                        ${renderExcerpt(result.item)}
                    </li>
                  </a>
                `).join('')}
                </ul>
              `
        }

        this.handleSearchInput = function handleSearchInput(event) {
            input = event.target.value
            results = []



            if (input.length >= 3) {
                if (fuse) {
                    results = fuse.search(input).slice(0, 7)
                } else {
                    // Fuse not ready yet; wait for it to load
                    results = []
                }
            }
            showAutoComplete = true
            autoCompleteNode.innerHTML = self.renderAutoComplete()
        }

        this.handleAutoCompleteClick = function handleAutoCompleteClick(event) {
            event.stopPropagation() // Prevent click from bubbling to window click handler
            searchInputNode.value = event.target.textContent.trim()
            showAutoComplete = false
            self.handleSearchSubmit()
        }


        this.init = function init() {
            searchFormNode = container.querySelector('.search-form');
            searchInputNode = container.querySelector('.search-input');
            autoCompleteNode = container.querySelector('.search-auto-complete');
            resultNode = container.querySelector('.result');

            if (!searchFormNode) {
                return;
            }

            // Make sure we remove such if it's registered before.
            searchFormNode.removeEventListener('submit', this.handleSearchSubmit)
            searchInputNode.removeEventListener('input', this.handleSearchInput)
            autoCompleteNode.removeEventListener('click', this.handleAutoCompleteClick)

            searchFormNode.addEventListener('submit', this.handleSearchSubmit)
            searchInputNode.addEventListener('input', this.handleSearchInput)
            autoCompleteNode.addEventListener('click', this.handleAutoCompleteClick)
            try { if (container && container.dataset) { container.dataset.sspFuseInit = '1'; } } catch(_) {}

            // If the input already has a value (e.g., from URL prefill), render suggestions immediately when Fuse is ready
            try {
                if (searchInputNode && searchInputNode.value && searchInputNode.value.trim().length >= 3) {
                    // Attempt immediate render; if Fuse not ready yet, ssp-search-page.js will trigger another input on fuse-ready
                    self.handleSearchInput({ target: searchInputNode });
                }
            } catch(_) {}
        }

        this.init();

        return this;
    }

    function handleWindowClick(event) {
        let autocompleters = document.querySelectorAll('.search-auto-complete');
        if (autocompleters.length) {
            autocompleters.forEach((autocompleteNode) => autocompleteNode.classList.remove('show'));
        }
    }


    function initSearch() {
        try {
            if (ssp_search.use_selector) {
                maybeBuildSearch();
            } else {
                // Initialize all existing Fuse forms on the page
                var allForms = document.querySelectorAll('.ssp-search');
                allForms.forEach(function(node){ new FuseSearchForm(node); });
            }
        } catch (e) {
        }
    }


    function maybeBuildSearch() {
        if (!config) {
            return;
        }

        if (!config.selector) {
            return;
        }

        const selectors = config.selector.split(',').map(function (string) {
            return string.trim()
        }).filter(Boolean);

        for (let s = 0; s < selectors.length; s++) {
            let selector = selectors[s];

            if (!document.querySelectorAll(selector).length) {
                continue;
            }

            let allSelectors = document.querySelectorAll(selector);

            for (let i = 0; i < allSelectors.length; i++) {
                let node = allSelectors[i];
                // Normalize to the nearest form so both Fuse and Algolia behave the same
                let form = null;
                if (node.tagName && node.tagName.toLowerCase() === 'form') {
                    form = node;
                } else if (node.closest) {
                    form = node.closest('form');
                }
                if (!form) {
                    continue;
                }
                // Avoid double replacement
                try { if (form.dataset && form.dataset.sspReplaced === '1') continue; } catch(_) {}
                buildSearch(form);
            }
        }
    }

    function getRandomId() {
        var id = 'search' + Date.now() + (Math.random() * 100);

        if (document.getElementById(id)) {
            id = getRandomId();
        }

        return id;
    }

    function buildSearch(targetForm) {
        // Holder of search
        var div = document.createElement('div');
        // Random custom ID.
        var id = getRandomId();
        div.setAttribute('id', id);
        div.innerHTML = ssp_search.html;

        // Replace the form element with our unified markup
        targetForm.replaceWith(div);
        try { if (targetForm && targetForm.dataset) { targetForm.dataset.sspReplaced = '1'; } } catch(_) {}

        // Get it by ID to get the DOM element.
        var el = document.getElementById(id);
        var form = new FuseSearchForm(el);

        // After the form is fully rendered, populate the input and trigger search
        try {
            var finalize = function () {
                // No-op finalize: page-specific autofill and heading handling are done in ssp-search-page.js
                // We intentionally avoid synthetic submit/input here to keep this file Fuse-only.
            };
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(finalize);
            } else {
                setTimeout(finalize, 0);
            }
        } catch (_) {
        }
    }

    // Initialize core search behaviors when DOM is ready and when Fuse is ready
    (function () {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () {
                try {
                    initSearch();
                } catch (_) {
                }
            });
        } else {
            try {
                initSearch();
            } catch (_) {
            }
        }
        window.addEventListener('ssp:fuse-ready', function () {
            try {
                initSearch();
            } catch (_) {
            }
        });
    })();

    window.addEventListener('click', handleWindowClick)
} else {
    console.log('No Fuse.js config found.')
}
