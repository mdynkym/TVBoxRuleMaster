/**
 * --------------------------------------------------------------------
 * @description 项目前端核心文件，文件负责处理TVbox规则编辑器的所有前端逻辑，包括表单渲染、数据处理、
 * 规则测试、弹窗管理以及与服务器的交互。
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', () => {
    initDropdowns(); // 初始化下拉菜单

    /**
     * @description 全局变量和实例定义
     */
    let currentRulesData = {};
    let downloadStatus = {};
    let currentEditInfo = {};
    let rawJsonContent = '';
    let currentConfigBaseDir = '';

    const defaultJsonUrl = 'https://raw.githubusercontent.com/liu673cn/box/refs/heads/main/m.json';

    /**
     * @description 动态编译所有Handlebars模板
     */
    const templateIds = [
        'basic-tab-template', 'simple-item-template', 'site-item-template',
        'filter-item-template', 'tab-content-template', 'details-modal-body-template',
        'file-browser-body-template', 'add-site-modal-template', 'add-parse-modal-template',
        'add-filter-modal-template', 'download-modal-template', 'ai-helper-modal-template',
        'push-modal-template','settings-modal-template', 'add-live-modal-template','paste-modal-template'
    ];
    
    const templates = templateIds.reduce((acc, id) => {
        const key = id.replace(/-template$/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase());
        acc[key] = Handlebars.compile(document.getElementById(id)?.innerHTML || '');
        return acc;
    }, {});

    /**
     * @description 注册Handlebars助手函数
     */
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('endsWith', (str, suffix) => typeof str === 'string' && str.endsWith(suffix));
    Handlebars.registerHelper('buildList', function(children) {
        if (children && children.length > 0) {
            return new Handlebars.SafeString(templates.fileBrowserBody({ files: children }));
        }
        return '';
    });
    
    /**
     * @description 页面主要元素的引用
     */
    const jsonUrlInput = document.getElementById('jsonUrlInput');
    const localFileInput = document.getElementById('localFileInput');
    const loadingDiv = document.getElementById('loading');
    const uploadFileInput = document.getElementById('uploadFileInput');

    /**
     * @description 更新所有列表的列数
     */

    function updateGridColumns() {
        const columns = localStorage.getItem('gridColumns') || '2';
        document.querySelectorAll('.rule-list-grid').forEach(grid => {
            grid.style.setProperty('--grid-columns', columns);
        });
    }
    
    /**
     * @description 更新UI上的下载状态指示器
     * @param {string} uniqueId - 状态元素的唯一ID
     * @param {string} status - 新的状态 (e.g., 'pending', 'downloading', 'downloaded', 'failed')
     */
    function updateDownloadStatusUI(uniqueId, status) {
        const statusElement = document.getElementById(`status-${uniqueId}`);
        if (statusElement) {
            statusElement.className = `download-status ${status || 'pending'}`;
        }
    }


    // 提示横幅
    const reminderBanner = document.getElementById('save-reminder-banner');
    const closeReminderBtn = document.getElementById('close-save-reminder');

    if (reminderBanner && closeReminderBtn) {
        if (localStorage.getItem('hideSaveReminder') !== 'true') {
            reminderBanner.style.display = 'flex';
        }
        closeReminderBtn.addEventListener('click', () => {
            reminderBanner.style.display = 'none';
            localStorage.setItem('hideSaveReminder', 'true');
        });
    }

    /**
     * @description 更新单个爬虫规则项的综合下载状态
     * @param {number} index - 爬虫规则的索引
     */
    function updateCombinedSiteStatus(index) {
        const site = currentRulesData.sites[index];
        if (!site) return;

        const assetsToCheck = ['jar', 'ext', 'api'];
        const statuses = [];
        
        assetsToCheck.forEach(key => {
            const assetId = `site-${index}-${key}`;
            if (downloadStatus.hasOwnProperty(assetId)) {
                statuses.push(downloadStatus[assetId]);
            }
        });

        if (statuses.length === 0) {
            updateDownloadStatusUI(`site-item-${index}`, ''); /** 如果没有可下载资源，则清除状态 */
            return;
        }
        
        let combinedStatus = 'downloaded';
        if (statuses.some(s => s === 'failed')) {
            combinedStatus = 'failed';
        } else if (statuses.some(s => s === 'downloading')) {
            combinedStatus = 'downloading';
        } else if (statuses.some(s => s === 'pending')) {
            combinedStatus = 'pending';
        }
        
        updateDownloadStatusUI(`site-item-${index}`, combinedStatus);
    }

    /**
     * @description 从URL加载并渲染规则
     */
    function loadAndRenderRulesFromUrl() {
        const url = new URL(jsonUrlInput.value.trim()).href;
        if (!url) {
            showToast('请输入有效的JSON链接地址。', 'error');
            return;
        }

        if (!url.startsWith('http')) {
            showToast('URL必须以http://或https://开头。', 'error');
            return;
        }
        jsonUrlInput.value = url;
        
        const savePathDir = window.APP_CONFIG.DEFAULT_SAVE_PATH;
        const urlPathSegment = `/${savePathDir}/`;

        if (url.includes(urlPathSegment)) {
            const pathAfterBox = url.split(urlPathSegment)[1];
            const lastSlashIndex = pathAfterBox.lastIndexOf('/');
            if (lastSlashIndex !== -1) {
                currentConfigBaseDir = pathAfterBox.substring(0, lastSlashIndex + 1);
            } else {
                currentConfigBaseDir = '';
            }
        } else {
            currentConfigBaseDir = '';
        }

        loadingDiv.style.display = 'block';
        rawJsonContent = '';
        const proxyUrl = `index.php/Proxy/load?target_url=${encodeURIComponent(url)}`;
        const fetchOptions = {
            method: 'GET',
            headers: {}
        };
        const globalUA = localStorage.getItem('globalUserAgent') || 'okhttp/3.15';
        if (globalUA) {
            fetchOptions.headers['X-Custom-UA'] = globalUA;
        }
        fetch(proxyUrl, fetchOptions)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
                return response.text();
            })
            .then(responseText => {

                rawJsonContent = responseText;
                updateLocalStorageHistory('urlHistory', url);
                localStorage.setItem('savedJsonUrl', url);
                document.getElementById('file-name-display').textContent = url.split('/').pop();
                processJsonContent(responseText);
            })
            .catch(error => {
                showToast(`读取或解析失败: ${error.message}`, 'error');
                
                const formData = new FormData();
                formData.append('target_url', url);
                
                fetch('index.php/Proxy/clearCacheForUrl', {
                    method: 'POST',
                    body: formData
                }).then(res => res.json()).then(result => {
                    if (result.success) {
                        console.log('旧缓存清理成功:', result.message);
                    } else {
                        console.warn('旧缓存清理失败:', result.message);
                    }
                }).catch(err => {
                    console.error('发送清理缓存请求时出错:', err);
                });
            })
            .finally(() => {
                loadingDiv.style.display = 'none';
            });
    }

    /**
     * @description 从本地文件加载并渲染规则
     * @param {Event} event - 文件输入事件
     */
    function loadAndRenderRulesFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            rawJsonContent = e.target.result;
            document.getElementById('file-name-display').textContent = file.name;
            processJsonContent(e.target.result);
        };
        reader.onerror = () => showToast('读取本地文件失败。', 'error');
        reader.readAsText(file);
        event.target.value = '';
    }

    /**
     * @description 处理JSON内容并分发渲染
     * @param {string} content - JSON字符串内容
     */
    function processJsonContent(content) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.innerHTML = '');
        loadingDiv.style.display = 'block';
        try {
            currentRulesData = parseCleanJson(content);

            if (!isValidConfigFormat(currentRulesData)) {
                throw new Error('文件内容不是有效的主配置格式');
            }

            function traverseAndProxy(node) {
                if (typeof node === 'string') {
                    return applyGitHubProxy(node);
                }
                if (Array.isArray(node)) {
                    return node.map(traverseAndProxy);
                }
                if (typeof node === 'object' && node !== null) {
                    const newObj = {};
                    for (const key in node) {
                        newObj[key] = traverseAndProxy(node[key]);
                    }
                    return newObj;
                }
                return node;
            }
            currentRulesData = traverseAndProxy(currentRulesData);
            
            if (currentRulesData.sites && Array.isArray(currentRulesData.sites)) {
                const apisToUpdate = [...new Set(
                    currentRulesData.sites
                        .map(site => site.api)
                        .filter(api => typeof api === 'string' && (api.startsWith('csp_') || api.endsWith('.js') || api.endsWith('.py')))
                )];

                if (apisToUpdate.length > 0) {
                    fetch('index.php/Proxy/updateApiList', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(apisToUpdate)
                    });
                }
            }
            
            renderAllTabs(currentRulesData);

            setTimeout(() => {
                const initialActiveTab = document.querySelector('.tabs .tab-btn.active');
                if (initialActiveTab) {
                    const mockEvent = { currentTarget: initialActiveTab };
                    openTab(mockEvent, initialActiveTab.dataset.tab);
                }
            }, 0);
            
            showToast('规则加载并渲染成功！', 'success');
        } catch (error) {
            // 统一处理所有错误 (解析失败、格式无效等)
            showToast(`处理JSON失败: ${error.message}`, 'error');
        } finally {
            loadingDiv.style.display = 'none';
        }
    }
    
    /**
     * @description 渲染所有选项卡
     * @param {object} data - 完整的规则数据
     */
    function renderAllTabs(data = {}){
        renderBasicTab(data);
        renderLivesTab(data.lives);
        renderSitesTab(data.sites);
        renderParsesTab(data.parses, data.flags);
        renderFiltersTab(data.rules, data.ads);
        updateGridColumns();
    }
    
    /**
     * @description 从所有标签页的表单中读取当前值，并更新到 currentRulesData 对象中。
     */
    function updateCurrentRulesDataFromForm() {
        if (!currentRulesData) return;

        currentRulesData.spider = document.getElementById('spider-url')?.value || "";
        currentRulesData.wallpaper = document.getElementById('wallpaper-url')?.value || "";
        currentRulesData.warningText = document.getElementById('warning-text')?.value || "";

        const ijkText = document.getElementById('ijk-url')?.value;
        if (ijkText) {
            try {
                currentRulesData.ijk = JSON.parse(ijkText);
            } catch (e) {
                currentRulesData.ijk = ijkText;
            }
        }

        const flagsText = document.getElementById('flags')?.value;
        if (flagsText !== undefined) {
            currentRulesData.flags = flagsText.split(',').map(f => f.trim()).filter(Boolean);
        }

        const adsText = document.getElementById('ads')?.value;
        if (adsText !== undefined) {
            currentRulesData.ads = adsText.split('\n').map(a => a.trim()).filter(Boolean);
        }
    }

    /**
     * @description 渲染基础信息选项卡
     * @param {object} data - 规则数据
     */
    function renderBasicTab(data) {
        const container = document.getElementById('basic');
        if (!container || !data) return;
        
        container.innerHTML = templates.basicTab({
            spiderPath: data.spider || '',
            wallpaper: data.wallpaper || '',
            ijk: data.ijk ? JSON.stringify(data.ijk, null, 2) : '',
            warningText: data.warningText || ''
        });
        
        updateDownloadStatusUI('spider', downloadStatus['spider'] || 'pending');
    }

    /**
     * @description 渲染爬虫规则选项卡
     * @param {Array} sites - 站点规则数组
     */
    function renderSitesTab(sites) {
        const container = document.getElementById('sites');
        if (!container) return;
        
        container.innerHTML = templates.tabContent({ 
            entityName: '爬虫', 
            itemType: 'sites',
            showCreateButton: true
        });

        const grid = container.querySelector('.rule-list-grid');
        grid.addEventListener('click', handleGridItemClick);

        let listHtml = '';
        (sites || []).forEach((site, index) => {
            const ext = parseAssetPath(site.ext);
            const jar = parseAssetPath(site.jar);
            
            let combinedStatus = 'pending';
            const jarStatusId = `site-${index}-jar`;
            const extStatusId = `site-${index}-ext`;
            const jarStatus = downloadStatus[jarStatusId];
            const extStatus = downloadStatus[extStatusId];
            if (jarStatus === 'failed' || extStatus === 'failed') combinedStatus = 'failed';
            else if (jarStatus === 'downloading' || extStatus === 'downloading') combinedStatus = 'downloading';
            else if (jarStatus === 'downloaded' || extStatus === 'downloaded') combinedStatus = 'downloaded';

            listHtml += templates.siteItem({
                index: index,
                name: site.name,
                api: site.api || '',
                displayValue: ext || site.api || site.key || '',
                hasAssets: (typeof jar === 'string' && jar.startsWith('./')) || (typeof ext === 'string' && ext.startsWith('./')),
                combinedStatus: combinedStatus
            });
        });
        grid.innerHTML = listHtml;
    }

    /**
     * @description 渲染解析接口选项卡
     * @param {Array} parses - 解析规则数组
     * @param {Array} flags - 解析标识数组
     */
    function renderParsesTab(parses, flags) {
        const container = document.getElementById('parses');
        if (!container) return;
        container.innerHTML = templates.tabContent({ 
            entityName: '解析', 
            itemType: 'parses',
            showCreateButton: true
        });
        container.querySelector('.rule-list-grid').addEventListener('click', handleGridItemClick);
        
        const grid = container.querySelector('.rule-list-grid');
        let listHtml = '';
        (parses || []).forEach((parse, index) => {
            listHtml += templates.simpleItem({
                itemType: 'parses',
                index: index,
                name: parse.name,
                url: parse.url
            });
        });
        grid.innerHTML = listHtml;
        if (Array.isArray(flags)) {
            container.insertAdjacentHTML('beforeend', `<div class="form-group list-footer"><label for="flags">解析标识 (flags)</label><textarea id="flags" rows="3">${flags.join(',')}</textarea></div>`);
        }
    }

    /**
     * @description 渲染直播规则选项卡
     * @param {Array} lives - 直播规则数组
     */
    function renderLivesTab(lives){
        const container = document.getElementById('lives');
        if(!container) return;
        container.innerHTML = templates.tabContent({ 
            entityName: '直播', 
            itemType: 'lives',
            showCreateButton: true 
        });
        container.querySelector('.rule-list-grid').addEventListener('click', handleGridItemClick);
        
        const grid = container.querySelector('.rule-list-grid');
        let listHtml = '';
        (lives || []).forEach((live, index) => {
            listHtml += templates.simpleItem({
                itemType: 'lives',
                index: index,
                name: live.name,
                url: live.url
            });
        });
        grid.innerHTML = listHtml;
    }

    /**
     * @description 渲染广告过滤选项卡
     * @param {Array} rules - 过滤规则数组
     * @param {Array} ads - 广告域名数组
     */
    function renderFiltersTab(rules, ads) {
        const container = document.getElementById('filters');
        if (!container) return;
        container.innerHTML = templates.tabContent({ 
            entityName: '过滤规则', 
            itemType: 'rules',
            showCreateButton: true
        });
        container.querySelector('.rule-list-grid').addEventListener('click', handleGridItemClick);

        const grid = container.querySelector('.rule-list-grid');
        let listHtml = '';
        (rules || []).forEach((rule, index) => {
            listHtml += templates.filterItem({
                index: index,
                name: rule.name,
                host: rule.host,
                // 将数组形式的 hosts/rule/regex 转换为多行文本
                hosts: Array.isArray(rule.hosts) ? rule.hosts.join(', ') : rule.hosts,
                rule: Array.isArray(rule.rule) ? rule.rule.join('\n') : rule.rule,
                regex: Array.isArray(rule.regex) ? rule.regex.join('\n') : rule.regex
            });
        });
        grid.innerHTML = listHtml;
        if (Array.isArray(ads)) {
            container.insertAdjacentHTML('beforeend', `<div class="form-group list-footer"><label for="ads">广告域名 (ads)</label><textarea id="ads" rows="3">${ads.join('\n')}</textarea></div>`);
        }
    }

    /**
     * @description 打开文件浏览器弹窗
     * @param {object} [options={}] - 配置对象
     * @param {string} [options.mode='open'] - 模式, 'open' (默认) 或 'select'
     * @param {string} [options.filter='*'] - 文件筛选, '*'代表全部, 'jar|json'代表指定类型
     * @param {function} [options.onSelect=null] - 在 'select' 模式下, 选中文件后的回调函数
     */
    async function openFileBrowser(options = {}) {
        const { mode = 'open', filter = '*', onSelect = null } = options;

        let footerHtml = '';
        if (mode === 'select') {
            footerHtml = `<button id="confirm-select-file-btn" class="btn primary-btn">确认选择</button>`;
        } else {
            footerHtml = `
                <button id="create-new-config-btn" class="btn secondary-btn">新建配置</button>
                <button id="open-selected-file-btn" class="btn primary-btn">打开配置</button>
            `;
        }

        const fileBrowserModal = new Modal({
            id: 'file-browser-modal',
            title: '文件管理器',
            footer: footerHtml
        });

        const body = fileBrowserModal.getBodyElement();
        body.innerHTML = '<div class="loading-spinner"></div>';
        
        let initialPath = '';
        if (mode === 'select') {
            const mainConfigUrl = jsonUrlInput.value.trim();
            if (mainConfigUrl) {
                try {
                    const path = new URL(mainConfigUrl).pathname;
                    initialPath = path.substring(0, path.lastIndexOf('/'));
                } catch(e) { }
            }
        }
        
        // 将 filter 传递给 refreshFileBrowser
        await refreshFileBrowser(body, new Set(), initialPath, filter);

        if (mode === 'select' && typeof onSelect === 'function') {
            const confirmBtn = document.getElementById('confirm-select-file-btn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    const selectedRadio = document.querySelector('#file-browser-modal .modal-main-content input[name="server-file-radio"]:checked');
                    if (!selectedRadio) {
                        showToast('请先选择一个文件！', 'error');
                        return;
                    }
                    const selectedPath = selectedRadio.value;
                    onSelect(selectedPath);
                    closeModalById('file-browser-modal');
                }, { once: true });
            }
        }
    }

    /**
     * @description 获取当前文件浏览器中所有已展开目录的路径
     * @returns {Set<string>} 一个包含所有已展开目录路径的 Set
     */
    function getExpandedPaths() {
        const expandedPaths = new Set();
        const fileBrowserModal = document.getElementById('file-browser-modal');
        if (fileBrowserModal) {
            const expandedDirs = fileBrowserModal.querySelectorAll('li.dir:not(.collapsed)');
            expandedDirs.forEach(dir => {
                if (dir.dataset.path) {
                    expandedPaths.add(dir.dataset.path);
                }
            });
        }
        return expandedPaths;
    }

    /**
     * @description 刷新文件浏览器内容, 并恢复指定的展开状态
     * @param {HTMLElement} container - 文件列表的容器元素
     * @param {Set<string>} [expandedPaths=new Set()] - 需要保持展开状态的目录路径集合
     * @param {string} [initialPath=''] - 初始加载时要展开到的目录路径
     * @param {string} [filter='*'] - 文件类型筛选器
     */
    async function refreshFileBrowser(container, expandedPaths = new Set(), initialPath = '', filter = '*') {
        if (!container) {
            const modal = document.getElementById('file-browser-modal');
            if (!modal) return;
            container = modal.querySelector('.modal-main-content');
        }
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const response = await fetch(`index.php/Proxy/listFiles?path=${encodeURIComponent(initialPath)}`);
            if (!response.ok) throw new Error('无法获取文件列表');
            let files = await response.json();
            
            // 使用递归函数来标记整个文件树
            const filterExtensions = filter === '*' ? null : filter.split('|').map(ext => `.${ext.trim().toLowerCase()}`);

            function markSelectable(fileList) {
                if (!Array.isArray(fileList)) return;

                fileList.forEach(file => {
                    if (file.type === 'file') {
                        if (filterExtensions) {
                            file.isSelectable = filterExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                        } else {
                            file.isSelectable = true; // 如果 filter 是 '*', 所有文件都可选
                        }
                    } else {
                        file.isSelectable = false; // 目录永远不可选
                        // 递归处理子目录
                        if (file.children && file.children.length > 0) {
                            markSelectable(file.children);
                        }
                    }
                });
            }

            // 对从服务器获取的顶层文件列表执行标记
            markSelectable(files);

            if (files.length === 0) {
                container.innerHTML = '<p>服务器上的 "box" 目录为空或不存在。</p>';
            } else {
                container.innerHTML = templates.fileBrowserBody({ files: files });
                // 恢复展开状态
                expandedPaths.forEach(path => {
                    const dirLi = container.querySelector(`li.dir[data-path="${path}"]`);
                    if (dirLi) {
                        dirLi.classList.remove('collapsed');
                        const icon = dirLi.querySelector('.toggle-icon');
                        if (icon) icon.textContent = '−';
                    }
                });
            }
        } catch (error) {
            container.innerHTML = `<p class="error-message">加载失败: ${error.message}</p>`;
        }
    }

   /**
     * @description 验证加载的数据是否符合主配置格式
     * @param {object} data - 已解析的JSON数据
     * @returns {boolean} - 如果格式有效则返回 true, 否则返回 false
     */
    function isValidConfigFormat(data) {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            return false;
        }
        const requiredKeys = ['sites', 'parses', 'flags', 'rules', 'ads', 'spider'];
        return requiredKeys.some(key => Array.isArray(data[key]));
    }
    
    /**
     * @description 打开选中的服务器文件
     */
    function openSelectedServerFile() {
        const selectedRadio = document.querySelector('#file-browser-modal .modal-main-content input[name="server-file-radio"]:checked');
        if (!selectedRadio) {
            showToast('请先选择一个JSON文件！', 'error');
            return;
        }
        const filePath = selectedRadio.value;
        const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
        const savePathDir =window.APP_CONFIG.DEFAULT_SAVE_PATH;
        const newUrl = `${window.location.origin}${currentPath}/${savePathDir}/${filePath}`;

        jsonUrlInput.value = newUrl;
        closeModalById('file-browser-modal');
        loadAndRenderRulesFromUrl();
    }
    
    /**
     * @description 打开详情编辑弹窗
     * @param {object} itemData - 该项的数据
     * @param {string} itemType - 项目类型
     * @param {number} index - 项目索引
     */
    function openDetailsModal(itemData, itemType, index) {
        if (!itemData) return;
        
        const configs = {
            sites: siteConfig,
            parses: parseConfig,
            lives: liveConfig,
            rules: filterConfig
        };
        const config = configs[itemType];
        if(!config) {
             showToast('该项目类型不支持编辑', 'warning');
             return;
        }

        currentEditInfo = { itemData, itemType, index, config };
        
        const fields = config.fieldOrder.map(key => {
            if (!config.translations[key]) return null;
            let value = itemData[key];
            if (typeof value === 'object' && value !== null) {
                value = JSON.stringify(value, null, 2);
            }
            const isBoolean = config.booleanFields.includes(key);
            return {
                id: `${itemType}-${index}-detail-${key}`,
                label: config.translations[key],
                value: value === undefined || value === null ? '' : value,
                isTextarea: config.textareaFields.includes(key) || (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))),
                isBoolean: isBoolean,
                fullWidth: config.fullWidthFields.includes(key),
                trueValue: key === 'pass' ? 'true' : 1,
                falseValue: key === 'pass' ? 'false' : 0,
                trueText: key === 'pass' ? 'True' : '是',
                falseText: key === 'pass' ? 'False' : '否',
            };
        }).filter(Boolean);
        
        new Modal({
            id: 'details-modal',
            title: `编辑 - ${itemData.name || '项目'}`,
            content: templates.detailsModalBody({ fields: fields }),
            footer: '<button id="modal-save-btn" class="btn primary-btn">确认</button>'
        });
    }

    /**
     * @description 保存弹窗修改
     */
    function saveModalChanges() {
        const { itemType, index, config } = currentEditInfo;
        if (!itemType || index === undefined || !config) return;
        
        const updatedData = { ...currentRulesData[itemType][index] };
        
        config.fieldOrder.forEach(key => {
            const inputElement = document.getElementById(`${itemType}-${index}-detail-${key}`);
            if (inputElement) {
                let value = inputElement.value;
                if (config.booleanFields.includes(key)) {
                    if (key === 'pass') {
                        updatedData[key] = value === 'true';
                    } else {
                        updatedData[key] = value === '1' ? 1 : 0;
                    }
                } else if (inputElement.tagName === 'TEXTAREA' && (value.startsWith('[') || value.startsWith('{'))) {
                    try {
                        updatedData[key] = JSON.parse(value);
                    } catch (e) { updatedData[key] = value; }
                } else {
                    updatedData[key] = value;
                }
            }
        });
        
        currentRulesData[itemType][index] = updatedData;
        renderAllTabs(currentRulesData);
        closeModalById('details-modal');
        showToast('修改已确认', 'success');
    }

    /**
     * @description 删除指定项目
     * @param {string} itemType - 项目类型
     * @param {number} index - 项目索引
     */
    function deleteItem(itemType, index) {
        if (!currentRulesData[itemType] || currentRulesData[itemType][index] === undefined) return;
        
        const itemElement = document.querySelector(`[data-item-type="${itemType}"][data-index="${index}"]`);

        if(itemElement){
            itemElement.classList.add('item-fade-out');
        }
        
        setTimeout(() => {
            currentRulesData[itemType].splice(index, 1);
            renderAllTabs(currentRulesData);
            showToast('项目已删除', 'success');
        }, 300);
    }
    
    /**
     * @description 应用一个统一的站点过滤器
     * @param {HTMLElement} clickedBtn - 被点击的按钮元素
     */
    function applySiteFilter(clickedBtn) {
        const isAlreadyActive = clickedBtn.classList.contains('active');

        document.querySelectorAll('.site-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const items = document.querySelectorAll('#sites .rule-item-container');
        
        if (!isAlreadyActive) {
            clickedBtn.classList.add('active');

            const filterType = clickedBtn.dataset.filterType;
            const filterValue = clickedBtn.dataset.filterValue;

            items.forEach(item => {
                const index = parseInt(item.dataset.index, 10);
                const siteData = currentRulesData.sites[index];
                if (!siteData) return;

                const itemApi = siteData.api || '';
                const itemExt = siteData.ext || '';
                let isMatch = false;

                switch (filterType) {
                    case 'equals':
                        isMatch = itemApi === filterValue;
                        break;
                    case 'endsWith':
                        isMatch = itemExt.endsWith(filterValue);
                        break;
                }
                item.style.display = isMatch ? '' : 'none';
            });
        } else {
            items.forEach(item => {
                item.style.display = '';
            });
        }
    }

    /**
     * @description 添加新的爬虫规则
     */
    async function addSpider() {
        const newSite = {
            key: document.getElementById('new-site-key-modal').value.trim(),
            name: document.getElementById('new-site-name-modal').value.trim(),
            type: parseInt(document.getElementById('new-site-type-modal').value, 10),
            api: document.getElementById('new-site-api-modal').value.trim(),
            searchable: document.getElementById('new-site-searchable-modal').checked ? 1 : 0,
            quickSearch: document.getElementById('new-site-quick-modal').checked ? 1 : 0,
            filterable: document.getElementById('new-site-filterable-modal').checked ? 1 : 0,
            ext: document.getElementById('new-site-ext-modal').value.trim(),
            jar: document.getElementById('new-site-jar-modal').value.trim(),
        };
        
        if (!newSite.name || !newSite.key || !newSite.ext) {
            showToast('规则名称、唯一标识和规则链接不能为空！', 'error');
            return;
        }

        if (currentRulesData.sites && currentRulesData.sites.length > 0) {
            const isDuplicate = currentRulesData.sites.some(site => 
                site.name.toLowerCase() === newSite.name.toLowerCase() ||
                site.key.toLowerCase() === newSite.key.toLowerCase() ||
                site.ext === newSite.ext
            );

            if (isDuplicate) {
                scrollToTop();
                showToast('规则名称、唯一标识或链接已存在，请修改后重试。', 'error');
                return;
            }
        }

        if (newSite.ext.startsWith('./') && newSite.ext.endsWith('.json')) {
            const customContent = document.getElementById('new-site-custom-content-modal').value;
            const saveAsDefault = document.getElementById('save-as-default-toggle-modal').checked;
            
            const pathFromInput = newSite.ext.substring(2);
            const finalRelativePath = currentConfigBaseDir + pathFromInput;

            const formData = new FormData();
            formData.append('relativePath', finalRelativePath);
            formData.append('apiName', newSite.api);
            formData.append('customContent', customContent);
            formData.append('saveAsDefault', saveAsDefault);

            try {
                showToast('正在创建规则文件...', 'info');
                const response = await fetch('index.php/Proxy/createRuleFile', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message);
                }
                showToast(result.message, 'success');

            } catch (error) {
                showToast(`文件创建失败: ${error.message}`, 'error');
                return;
            }
        }

        if (!currentRulesData.sites) currentRulesData.sites = [];
        currentRulesData.sites.unshift(newSite);
        renderSitesTab(currentRulesData.sites);
        showToast('新爬虫规则已成功添加！', 'success');
        closeModalById('add-site-modal');
    }

    /**
     * @description 添加新的解析接口
     */
    function addParse() {
        const newParse = {
            name: document.getElementById('new-parse-name-modal').value.trim(),
            type: parseInt(document.getElementById('new-parse-type-modal').value, 10),
            url: document.getElementById('new-parse-url-modal').value.trim(),
        };
        const extValue = document.getElementById('new-parse-ext-modal').value.trim();
        if (extValue) {
            try {
                newParse.ext = JSON.parse(extValue);
            } catch (e) {
                newParse.ext = extValue;
            }
        }
        if (!newParse.name || !newParse.url) {
            showToast('接口名称和接口地址不能为空！', 'error');
            return;
        }
        if (isNaN(newParse.type)) {
            showToast('类型必须是数字！', 'error');
            return;
        }
        if (!currentRulesData.parses) currentRulesData.parses = [];
        currentRulesData.parses.unshift(newParse);
        renderParsesTab(currentRulesData.parses, currentRulesData.flags);
        showToast('新解析接口已成功添加！', 'success');
        closeModalById('add-parse-modal');
    }

    /**
     * @description 添加新的过滤规则
     */
    function addFilterRule() {
        const newRule = {
            name: document.getElementById('new-filter-name-modal').value.trim() || undefined,
            host: document.getElementById('new-filter-host-modal').value.trim() || undefined,
        };
        const hostsText = document.getElementById('new-filter-hosts-modal').value.trim();
        const rulesText = document.getElementById('new-filter-rules-modal').value.trim();
        const regexText = document.getElementById('new-filter-regex-modal').value.trim(); // 读取regex字段

        try {
            if (hostsText) newRule.hosts = JSON.parse(hostsText);
            if (rulesText) newRule.rule = JSON.parse(rulesText);
            if (regexText) newRule.regex = JSON.parse(regexText); // 解析regex字段
        } catch (e) {
            showToast('hosts, rule, 或 regex 的JSON格式无效！', 'error');
            return;
        }

        Object.keys(newRule).forEach(key => newRule[key] === undefined && delete newRule[key]);

        if (!currentRulesData.rules) currentRulesData.rules = [];
        currentRulesData.rules.unshift(newRule);
        renderFiltersTab(currentRulesData.rules, currentRulesData.ads);
        showToast('新过滤规则已添加！', 'success');
        closeModalById('add-filter-modal');
    }

    /**
     * @description 添加新的直播源
     */
    function addLiveRule(){
        const getInputValue = (id) => document.getElementById(id)?.value.trim() || '';

        const name = getInputValue('new-live-name-modal');
        const url = getInputValue('new-live-url-modal');

        if (!name || !url) {
            showToast('名称和链接不能为空。', 'warning');
            return;
        }
        
        const newLive = {
            name: name,
            type: parseInt(getInputValue('new-live-type-modal') || '0', 10),
            pass: getInputValue('new-live-pass-modal') === 'true',
            url: url,
            epg: getInputValue('new-live-epg-modal') || undefined,
            logo: getInputValue('new-live-logo-modal') || undefined,
            ua: getInputValue('new-live-ua-modal') || undefined,
            playerType: getInputValue('new-live-playerType-modal') ? parseInt(getInputValue('new-live-playerType-modal'), 10) : undefined
        };
        
        // 清理值为 undefined 的字段
        Object.keys(newLive).forEach(key => newLive[key] === undefined && delete newLive[key]);
        
        if (!currentRulesData.lives) currentRulesData.lives = [];
        currentRulesData.lives.unshift(newLive);
        renderLivesTab(currentRulesData.lives);
        showToast('直播源已添加，请记得保存！', 'success');
        closeModalById('add-live-modal');
}


    /**
     * @description 启动下载流程 
     */
    async function startDownloadProcess() {
        const targetDir = document.getElementById('download-dir-input').value.trim();
        const targetFilename = document.getElementById('download-filename-input').value.trim();
        const mainJsonUrl = jsonUrlInput.value.trim();

        if (!targetDir || !targetFilename) {
            showToast('目录和文件名不能为空！', 'error');
            return;
        }

        const savePathDir = window.APP_CONFIG.DEFAULT_SAVE_PATH;

        const fileNameElement = document.getElementById('file-name-display');
        const originalTitle = document.title;
        const originalFileName = fileNameElement.textContent;
        const downloadFailures = new Map();
        const assetsToDownload = [];
        downloadStatus = {};

        try {
            showToast('开始下载流程...', 'info');
            closeModalById('download-modal');

            document.getElementById('basic').classList.add('show-status');
            document.getElementById('sites').classList.add('show-status');
            
            updateCurrentRulesDataFromForm();
            let dataToSave = JSON.parse(JSON.stringify(currentRulesData));
            const baseUrl = getBaseUrl(mainJsonUrl);
            
            const discoverAndRegisterAsset = (originalPath, assetId, site = null) => {
                if (site) {
                    if (site.type !== 3 || site.api.startsWith('csp_AppYs')) return;
                }

                if (typeof originalPath === 'object' && originalPath !== null) {
                    for (const key in originalPath) {
                        if (typeof originalPath[key] === 'string') {
                            discoverAndRegisterAsset(originalPath[key], `${assetId}-${key}`, site);
                        }
                    }
                    return;
                }

                if (typeof originalPath !== 'string' || !originalPath) return;
                if (originalPath.startsWith('http://127.0.0.1')) return;
                if (originalPath.includes('$$$') || originalPath.includes('|') || originalPath.includes('}')) return;

                
                const parsedPath = parseAssetPath(originalPath);
                const isLocalRelative = parsedPath.startsWith('./');
                const isRemote = parsedPath.startsWith('http');

                if (isLocalRelative || isRemote) {
                    let filename;
                    let sourceUrl = parsedPath;

                    if (isRemote) {
                        try {
                            let cleanUrl = parsedPath;
                            const githubIdentifier = 'https://raw.githubusercontent.com/';
                            const githubIndex = parsedPath.indexOf(githubIdentifier);

                            if (githubIndex !== -1) {
                                cleanUrl = parsedPath.substring(githubIndex);
                            }

                            const urlObject = new URL(cleanUrl);
                            filename = urlObject.pathname.split('/').pop();

                            if (!filename) {
                                // console.warn("无法从URL中确定文件名，已跳过:", parsedPath);
                                return;
                            }
                        } catch (e) {
                            // console.error("无法解析的远程URL，已跳过:", parsedPath, e);
                            return;
                        }
                    } else { 
                        filename = parsedPath.split('/').pop();
                    }
                    
                    if(isLocalRelative) {
                        sourceUrl = new URL(parsedPath, baseUrl).href;
                    }
                    
                    let targetRelativePath = filename;
                    const assetIdParts = assetId.split('-');
                    const assetType = assetIdParts[2]; 

                    if (assetType === 'jar') {
                        targetRelativePath = `libs/jar/${filename}`;
                    } 
                    else if (assetType === 'api') {
                        if (filename.endsWith('.js')) {
                            targetRelativePath = `libs/js/${filename}`;
                        } else if (filename.endsWith('.py')) {
                            targetRelativePath = `libs/py/${filename}`;
                        }
                    } 
                    else if (assetType === 'ext') {
                        if (filename.endsWith('.js')) {
                            targetRelativePath = `lib/js/${filename}`;
                        } else if (filename.endsWith('.py')) {
                            targetRelativePath = `lib/py/${filename}`;
                        } else {
                            if (site && site.api && typeof site.api === 'string') {
                                const apiValue = site.api;
                                if (apiValue.endsWith('.js')) {
                                    targetRelativePath = `lib/js/${filename}`;
                                } else if (apiValue.endsWith('.py')) {
                                    targetRelativePath = `lib/py/${filename}`;
                                } else if (apiValue.startsWith('csp_')) {
                                    const apiSubdir = apiValue.substring(4).toLowerCase();
                                    if (apiSubdir) {
                                        targetRelativePath = `lib/${apiSubdir}/${filename}`;
                                    }
                                }
                            }
                        }
                    }
                    
                    sourceUrl = applyGitHubProxy(sourceUrl);

                    const alreadyExists = assetsToDownload.some(task => task.sourceUrl === sourceUrl);
                    if (!alreadyExists) {
                        assetsToDownload.push({
                            sourceUrl: sourceUrl,
                            originalPath: originalPath,
                            targetRelativePath: targetRelativePath,
                            id: assetId
                        });
                        downloadStatus[assetId] = 'pending';
                    }
                }
            };

            discoverAndRegisterAsset(dataToSave.spider, 'spider');
            (dataToSave.sites || []).forEach((site, index) => {
                discoverAndRegisterAsset(site.jar, `site-${index}-jar`, site);
                discoverAndRegisterAsset(site.api, `site-${index}-api`, site);
                discoverAndRegisterAsset(site.ext, `site-${index}-ext`, site);
            });

            renderAllTabs(currentRulesData);
            const totalCount = assetsToDownload.length;
            showToast(`共找到 ${totalCount} 个资源需要下载...`, 'info');
            
            let downloadedCount = 0;
            const updateStatusText = () => {
                const statusText = `下载中 (已完成 ${downloadedCount} / 总计 ${totalCount})...`;
                document.title = statusText;
                fileNameElement.textContent = statusText;
            };
            updateStatusText();

            for (const task of assetsToDownload) {
                downloadStatus[task.id] = 'downloading';
                updateDownloadStatusUI(task.id, 'downloading');
                if (task.id.startsWith('site-')) updateCombinedSiteStatus(parseInt(task.id.split('-')[1]));

                try {
                    const formData = new FormData();
                    formData.append('action', 'download_asset');
                    formData.append('source_url', task.sourceUrl);
                    formData.append('target_dir', targetDir);
                    formData.append('relative_path', decodeURIComponent(task.targetRelativePath));
                    const response = await fetch('index.php/Proxy/downloadAsset', { method: 'POST', body: formData });
                    if (!response.ok) throw new Error(`服务器返回错误: ${response.status}`);
                    
                    const result = await response.json();
                    if (!result.success) throw new Error(result.message);

                    if (result.filePath) {
                        let returnedPath = result.filePath.replace(/\\/g, '/').trim();
                        const searchPrefix = `${savePathDir}/${targetDir}/`;
                        const prefixIndex = returnedPath.indexOf(searchPrefix);

                        if (prefixIndex !== -1) {
                            const relativePart = returnedPath.substring(prefixIndex + searchPrefix.length);
                            task.savedPath = './' + relativePart;
                        } else {
                            task.savedPath = returnedPath; 
                        }
                    }
                    
                    downloadStatus[task.id] = 'downloaded';
                } catch (error) {
                    downloadStatus[task.id] = 'failed';
                    downloadFailures.set(task.originalPath, error.message);
                }
                
                downloadedCount++;
                updateStatusText();

                updateDownloadStatusUI(task.id, downloadStatus[task.id]);
                if (task.id.startsWith('site-')) updateCombinedSiteStatus(parseInt(task.id.split('-')[1]));
            }

            const remapPath = (originalPath) => {
                if (typeof originalPath === 'object' && originalPath !== null) {
                    const newExtObject = { ...originalPath };
                    for (const key in newExtObject) {
                        if (typeof newExtObject[key] === 'string') {
                            newExtObject[key] = remapPath(newExtObject[key]);
                        }
                    }
                    return newExtObject;
                }

                if (typeof originalPath !== 'string') return originalPath;

                if (downloadFailures.has(originalPath)) return originalPath;
                for (const asset of assetsToDownload) {
                    if (asset.originalPath === originalPath) {
                        if (asset.savedPath) {
                            return asset.savedPath;
                        }
                        return asset.targetRelativePath;
                    }
                }
                return originalPath;
            };

            dataToSave.spider = remapPath(dataToSave.spider);
            (dataToSave.sites || []).forEach(site => {
                site.jar = remapPath(site.jar);
                site.ext = remapPath(site.ext);
                site.api = remapPath(site.api);
            });
            currentRulesData = dataToSave; 
            const finalContentToSave = JSON.stringify(currentRulesData, null, 2);
            const saveFormData = new FormData();
            saveFormData.append('action', 'save_config');
            saveFormData.append('dir', targetDir);
            saveFormData.append('filename', targetFilename);
            saveFormData.append('content', finalContentToSave);
            const saveResponse = await fetch('index.php/Proxy/saveConfig', { method: 'POST', body: saveFormData });
            if (!saveResponse.ok) throw new Error(`服务器返回错误: ${saveResponse.status}`);
            const saveResult = await saveResponse.json();
            if (!saveResult.success) throw new Error(saveResult.message);
            showToast('主配置文件保存成功！', 'success');

            const failureCount = downloadFailures.size;
            let reportMessage = `<p>总计任务: ${totalCount}<br>成功: ${totalCount - failureCount}<br>失败: ${failureCount}</p>`;
            if (failureCount > 0) {
                let failureList = Array.from(downloadFailures.keys()).map(file => `<li style="color:red; margin-bottom:5px;">${file}</li>`).join('');
                reportMessage += `<p><b>失败列表 (已在配置中保留原始链接):</b></p><ul style="list-style-type:none; padding-left:0; max-height:150px; overflow-y:auto;">${failureList}</ul>`;
            }
            await showDialog({ type: 'alert', title: '下载报告', message: reportMessage, okText: '关闭' });

            const currentPath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
            const newUrl = `${window.location.origin}${currentPath}/${savePathDir}/${targetDir}/${targetFilename}`;
            jsonUrlInput.value = newUrl;
            updateLocalStorageHistory('urlHistory', newUrl);

        } catch (error) {
            showToast(`下载流程发生严重错误: ${error.message}`, 'error');
        } finally {
            document.title = originalTitle;
            fileNameElement.textContent = originalFileName;
            setTimeout(() => {
                document.getElementById('basic').classList.remove('show-status');
                document.getElementById('sites').classList.remove('show-status');
                downloadStatus = {};
                renderAllTabs(currentRulesData);
            }, 5000);
        }
    }

    /**
     * @description 项目编辑的配置对象
     */
    const siteConfig = {
        translations: { key: '唯一标识', name: '规则名称', type: '类型', api: '爬虫接口', ext: '规则链接', searchable: '可搜索', quickSearch: '快速搜索', filterable: '可筛选', jar: 'Jar文件' },
        fieldOrder: ['key', 'name', 'type', 'api', 'ext', 'searchable', 'quickSearch', 'filterable', 'jar'],
        booleanFields: ['searchable', 'quickSearch', 'filterable'],
        textareaFields: ['ext', 'jar'],
        fullWidthFields: ['ext', 'jar']
    };
    const parseConfig = {
        translations: { name: '接口名称', type: '类型', url: '接口地址', ext: '扩展参数' },
        fieldOrder: ['name', 'type', 'url', 'ext'],
        booleanFields: [],
        textareaFields: ['url', 'ext'],
        fullWidthFields: ['url', 'ext']
    };
    const liveConfig = {
        translations: { name: '名称', type: '类型', pass: 'Pass', url: '链接', epg: 'EPG', logo: 'Logo', ua: 'User-Agent', playerType: '播放器类型' },
        fieldOrder: ['name', 'type', 'pass', 'url', 'epg', 'logo', 'ua', 'playerType'],
        booleanFields: ['pass'],
        textareaFields: [],
        fullWidthFields: ['url', 'epg', 'logo', 'ua', 'playerType']
    };
    const filterConfig = {
        translations: { name: 'name', host: 'host', hosts: 'hosts', rule: 'rule', regex: 'regex' },
        fieldOrder: ['name', 'host', 'hosts', 'rule', 'regex'],
        booleanFields: [],
        textareaFields: ['host', 'hosts', 'rule', 'regex'],
        fullWidthFields: ['host', 'hosts', 'rule', 'regex']
    };
    
    /**
     * @description 为规则列表（grid）中的项处理点击事件（事件委托）
     * @param {Event} e - 点击事件对象
     */
    async function handleGridItemClick(e) {
        const itemContainer = e.target.closest('.rule-item-container');
        if (!itemContainer) return;
        
        const itemType = itemContainer.dataset.itemType;
        const index = parseInt(itemContainer.dataset.index, 10);
        const itemData = currentRulesData[itemType]?.[index];

        if (!itemData) return;
        
        const deleteButton = e.target.closest('.delete-item-btn');
        if(deleteButton){
            e.stopPropagation();
            deleteItem(itemType, index);
            return;
        }

        const actionButton = e.target.closest('.action-btn');
        if(actionButton){
            e.stopPropagation();
            const action = actionButton.dataset.action;
            if (action === 'copy-rule') {
                let clipboardItems = [];
                const existingClipboard = localStorage.getItem('global_rule_clipboard');
                if (existingClipboard) {
                    try {
                        const parsed = JSON.parse(existingClipboard);
                        if (Array.isArray(parsed)) {
                            clipboardItems = parsed;
                        }
                    } catch (e) { }
                }

                const newClipboardData = {
                    data: JSON.parse(JSON.stringify(itemData)),
                    sourceBaseDir: currentConfigBaseDir
                };
                
                const itemExists = clipboardItems.some(item => item.data.key === newClipboardData.data.key && item.sourceBaseDir === newClipboardData.sourceBaseDir);
                if (!itemExists) {
                    clipboardItems.unshift(newClipboardData);
                }

                if (clipboardItems.length > 10) {
                    clipboardItems = clipboardItems.slice(0, 10);
                }

                localStorage.setItem('global_rule_clipboard', JSON.stringify(clipboardItems));
                showToast(`规则 “${itemData.name}” 已复制`, 'success');
                return;
            }

            if (action === 'check-rule') {
                checkRuleHealth(itemData);
                return;
            }
            if (action === 'test-url' && actionButton.dataset.url) {
                window.open(actionButton.dataset.url, '_blank');
            } else if (action === 'edit-file') {
                updateCurrentRulesDataFromForm();
                
                let targetFile = null;
                const extPath = parseAssetPath(itemData.ext);
                if (extPath && /\.(json|js|py|txt)$/i.test(extPath)) {
                    targetFile = extPath;
                }
                const jarPath = parseAssetPath(itemData.jar);
                if (!targetFile && jarPath && /\.(js|py)$/i.test(jarPath)) {
                    targetFile = jarPath;
                }

                if (!targetFile) {
                    showToast('该规则为内置或不可编辑文件类型', 'info');
                    return;
                }

                const savePathDir = window.APP_CONFIG.DEFAULT_SAVE_PATH;
                const urlPathSegment = `/${savePathDir}/`;
                const isLocal = jsonUrlInput.value.includes(window.location.origin) && jsonUrlInput.value.includes(urlPathSegment);
                let fileUrlPath;

                if (isLocal) {
                    const mainConfigPath = new URL(jsonUrlInput.value).pathname;
                    const baseDir = mainConfigPath.substring(0, mainConfigPath.lastIndexOf('/'));
                    const relativeFilePath = targetFile.replace('./', '');
                    fileUrlPath = `${baseDir}/${relativeFilePath}`.replace(urlPathSegment, '');

                    try {
                        const response = await fetch(`index.php/Proxy/checkFileExists?path=${encodeURIComponent(fileUrlPath)}`);
                        const result = await response.json();
                        if (!result.exists) {
                            showToast('文件在服务器上不存在，请先下载', 'error');
                            return;
                        }
                    } catch (error) {
                        showToast('检查文件是否存在时出错', 'error');
                        return;
                    }
                } else {
                    const targetStatusId = /\.(json|js|py)$/i.test(extPath) ? `site-${index}-ext` : `site-${index}-jar`;
                    if (downloadStatus[targetStatusId] !== 'downloaded') {
                        showToast('请先下载此规则文件才能进行编辑', 'error');
                        return;
                    }

                    const targetDirInput = document.getElementById('download-dir-input');
                    if (!targetDirInput || !targetDirInput.value.trim()) {
                        showToast('下载目录未设置，请先点击“下载”按钮设置目录后，再进行编辑', 'error');
                        return;
                    }
                    const targetDir = targetDirInput.value.trim();
                    fileUrlPath = `${targetDir}/${targetFile.replace('./', '')}`;
                }
                
                const openUrl = `index.php/Edit?file=${encodeURIComponent(fileUrlPath)}&api=${encodeURIComponent(itemData.api || '')}`;
                
                new Modal({
                    id: 'editor-modal-' + md5(fileUrlPath),
                    title: '编辑 - ' + itemData.name,
                    content: openUrl,
                    width: '95%',
                    height: '95%',
                    showMin: false
                });

            }
        } else {
            openDetailsModal(itemData, itemType, index);
        }
    }
    
    /**
     * @description 检测单个规则的资源健康度 (异步)
     * @param {object} siteData - 被点击的爬虫规则对象
     */
    async function checkRuleHealth(siteData) {
        showDialog({
            type: 'alert',
            title: `检测报告 - ${siteData.name}`,
            message: '<div id="health-check-results"><div class="loading-spinner"></div><p style="text-align:center;">正在发现资源，请稍候...</p></div>',
            okText: '关闭'
        }).catch(() => {});

        const resultsContainer = document.getElementById('health-check-results');

        try {
            const discoverFormData = new FormData();
            discoverFormData.append('siteObject', JSON.stringify(siteData));
            discoverFormData.append('baseConfigUrl', jsonUrlInput.value);

            const discoverResponse = await fetch('index.php/Proxy/discoverAssets', {
                method: 'POST',
                body: discoverFormData
            });
            const discoverResult = await discoverResponse.json();

            if (!discoverResult.success || discoverResult.assets.length === 0) {
                resultsContainer.innerHTML = `<p>未找到任何可检测的资源。</p>`;
                return;
            }

            let listHtml = '<ul style="list-style:none; padding:0; margin:0;">';
            discoverResult.assets.forEach((asset, index) => {
                const assetId = 'asset-check-' + index;
                listHtml += `
                    <li id="${assetId}" style="display:flex; justify-content:space-between; align-items:center; padding: 6px 0; border-bottom: 1px solid #eee;">
                        <span style="word-break:break-all; font-size: 14px; padding-right: 10px;">${asset}</span>
                        <strong class="health-status status-pending">检测中...</strong>
                    </li>
                `;
            });
            listHtml += '</ul>';
            resultsContainer.innerHTML = listHtml;
            
            const ulElement = resultsContainer.querySelector('ul');
            if (ulElement) {
                ulElement.style.maxHeight = '40vh';
                ulElement.style.overflowY = 'auto';
                ulElement.style.overscrollBehavior = 'contain';
            }


            /** @description 遍历列表，逐个向后端请求检测 */
            for (let i = 0; i < discoverResult.assets.length; i++) {
                const asset = discoverResult.assets[i];
                const assetId = 'asset-check-' + i;
                const listItem = document.getElementById(assetId);
                const statusElement = listItem.querySelector('strong');

                const testFormData = new FormData();
                testFormData.append('asset', asset);
                testFormData.append('baseConfigUrl', jsonUrlInput.value);

                try {
                    const testResponse = await fetch('index.php/Proxy/testSingleAsset', {
                        method: 'POST',
                        body: testFormData
                    });
                    const testResult = await testResponse.json();

                    if (testResult.success) {
                        const { status } = testResult.result;
                        statusElement.textContent = status;
                        if (status === '存在' || (status >= 200 && status < 400)) {
                            statusElement.className = 'health-status status-success';
                        } else if (status >= 400 && status < 500) {
                            statusElement.className = 'health-status status-warning';
                        } else {
                            statusElement.className = 'health-status status-error';
                        }
                    } else {
                        statusElement.textContent = '检测出错';
                        statusElement.className = 'health-status status-error';
                    }
                } catch (e) {
                    statusElement.textContent = '网络错误';
                    statusElement.className = 'health-status status-error';
                }
            }
        } catch (error) {
            resultsContainer.innerHTML = `<p style="color:red;">处理失败: ${error.message}</p>`;
        }
    }
    
    /**
     * @description 页面初始化和事件绑定
     */
    jsonUrlInput.value = localStorage.getItem('savedJsonUrl') || defaultJsonUrl;

    document.getElementById('readUrlBtn').addEventListener('click', loadAndRenderRulesFromUrl);
    
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const spiderUrl = document.getElementById('spider-url')?.value.trim();

            if (!spiderUrl) {
                showToast('爬虫Jar (spider) 不能为空，请先选择一个文件。', 'error');
                return;
            }

            const url = jsonUrlInput.value.trim();
            const savePathDir = window.APP_CONFIG.DEFAULT_SAVE_PATH;
            const urlPathSegment = `/${savePathDir}/`;

            if (!url.startsWith(window.location.origin) || !url.includes(urlPathSegment)) {
                showToast('错误：只能保存在此服务器上的文件！', 'error');
                return;
            }

            const pathParts = url.split(urlPathSegment);
            const relativePath = pathParts.length > 1 ? pathParts[1] : null;
            if (!relativePath) {
                showToast('无法从URL中解析出有效的文件路径！', 'error');
                return;
            }

            if (Object.keys(currentRulesData).length === 0) {
                showToast('没有可保存的数据，请先加载一个规则文件。', 'warning');
                return;
            }
            updateCurrentRulesDataFromForm();

            const fileContent = JSON.stringify(currentRulesData, null, 2);

            const formData = new FormData();
            formData.append('filePath', relativePath);
            formData.append('fileContent', fileContent);

            // showToast('正在保存...', 'info');
            fetch('index.php/Edit/save', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    showToast(result.message, 'success');
                } else {
                    throw new Error(result.message);
                }
            })
            .catch(error => {
                showToast(`保存失败: ${error.message}`, 'error');
            });
        });
    }

    document.getElementById('selectFileBtn').addEventListener('click', () => {
        openFileBrowser();
    });
    document.getElementById('downloadRulesBtn').addEventListener('click', () => {
        if (Object.keys(currentRulesData).length === 0) {
            showToast('请先加载一个配置文件！', 'error');
            return;
        }
        new Modal({
            id: 'download-modal',
            title: '下载配置及资源',
            content: templates.downloadModal(),
            footer: '<button id="start-download-btn" class="btn primary-btn">开始下载</button>'
        });
    });
    // document.getElementById('aiHelperBtn').addEventListener('click', () => {
    //     new Modal({
    //         id: 'ai-helper-modal',
    //         title: 'AI 帮写小助手',
    //         content: templates.aiHelperModal(),
    //     });
    // });
    document.getElementById('historyBtn').addEventListener('click', () => {
        const history = getLocalStorageItem('urlHistory', []);
        let listHtml = '<ul id="historyList">';
        if (history.length === 0) {
            listHtml += '<li>没有历史记录。</li>';
        } else {
            history.forEach(url => {
                listHtml += `<li class="history-item" data-url="${url}" title="加载: ${url}">${url}</li>`;
            });
        }
        listHtml += '</ul>';

        new Modal({
            id: 'history-modal',
            title: '加载历史记录',
            content: listHtml,
            footer: '<button id="clearHistoryBtn" class="btn danger-btn">清空历史记录</button>'
        });
    });

    // 全局设置弹窗
    document.getElementById('settingsBtn').addEventListener('click', () => {
        const currentProxy = localStorage.getItem('githubProxyUrl') || '';
        const globalUA = localStorage.getItem('globalUserAgent') || 'okhttp/3.15';

        new Modal({
            id: 'settings-modal',
            title: '全局设置',
            content: templates.settingsModal({ 
                proxyUrl: currentProxy,
                globalUA: globalUA
            }),
            footer: '<button id="save-settings-btn" class="btn primary-btn">保存</button>'
        });

        setTimeout(() => {
            const modalBody = document.getElementById('settings-modal').querySelector('.modal-main-content');
            
            modalBody.querySelector('.tabs').addEventListener('click', (e) => {
                if (e.target.matches('.tab-btn')) {
                    const tabId = e.target.dataset.tab;
                    modalBody.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                    modalBody.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
                    e.target.classList.add('active');
                    document.getElementById(tabId).style.display = 'block';
                }
            });

            const variablesContainer = document.getElementById('variable-defaults-inputs');
            const savedVariables = getLocalStorageItem('global_variables', {});
            const allVariables = ['wd', 'SearchPg', 'cateId', 'class', 'area', 'year', 'lang', 'by', 'catePg'];
            
            allVariables.forEach(varName => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'details-item';

                const label = document.createElement('label');
                label.className = 'details-label';
                label.textContent = `{${varName}}`;
                label.htmlFor = `global-var-${varName}`;
                
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `global-var-${varName}`;
                input.className = 'details-input';
                input.setAttribute('data-variable-name', varName);
                input.value = savedVariables[varName] || '';

                itemDiv.appendChild(label);
                itemDiv.appendChild(input);
                variablesContainer.appendChild(itemDiv);
            });

            const columnSelect = document.getElementById('settings-column-select');
            if (columnSelect) {
                columnSelect.value = localStorage.getItem('gridColumns') || '2';
            }

            document.getElementById('save-settings-btn').addEventListener('click', () => {
                const newProxy = document.getElementById('proxy-url-input').value.trim();
                if (newProxy && !newProxy.startsWith('http')) {
                    showToast('GitHub 加速域名格式不正确。', 'error');
                    return;
                }
                localStorage.setItem('githubProxyUrl', newProxy);

                const newGlobalUA = document.getElementById('global-ua-input').value.trim();
                localStorage.setItem('globalUserAgent', newGlobalUA);

                if (columnSelect) {
                    localStorage.setItem('gridColumns', columnSelect.value);
                    updateGridColumns();
                }

                const newVariables = {};
                const inputs = document.querySelectorAll('#variable-defaults-inputs input[data-variable-name]');
                inputs.forEach(input => {
                    const varName = input.getAttribute('data-variable-name');
                    if (varName) {
                        newVariables[varName] = input.value.trim();
                    }
                });
                localStorage.setItem('global_variables', JSON.stringify(newVariables));
                
                showToast('全局设置已保存！', 'success');
                closeModalById('settings-modal');
            });
            
            document.getElementById('clear-cache-btn').addEventListener('click', async () => {
                try {
                    await showDialog({
                        type: 'confirm',
                        title: '确认操作',
                        message: '您确定要清空所有代理缓存吗？此操作将导致下次加载规则时重新从源服务器获取。'
                    });
                    
                    const response = await fetch('index.php/Proxy/clearCache', { method: 'POST' });
                    const result = await response.json();

                    if (result.success) {
                        showToast(result.message, 'success');
                    } else {
                        throw new Error(result.message);
                    }

                } catch (error) {
                    if (error && error.message) {
                        showToast(`操作失败: ${error.message}`, 'error');
                    } else {
                        showToast('操作已取消', 'info');
                    }
                }
            });

        }, 0);
    });

    document.getElementById('online-edit-btn').addEventListener('click', () => {
        const url = jsonUrlInput.value.trim();
        const urlPathSegment = `/${window.APP_CONFIG.DEFAULT_SAVE_PATH}/`;
        if (url.startsWith(window.location.origin) && url.includes(urlPathSegment)) {
            const pathParts = new URL(url).pathname.split(urlPathSegment);
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                window.open(`index.php/Edit?file=${encodeURIComponent(filePath)}`, '_blank');
            } else {
                showToast('无法从当前URL解析出本地文件路径', 'error');
            }
        } else {
            showToast('请先将规则下载到本地，并加载本地规则后才能进行在线编辑', 'warning');
        }
    });

    document.getElementById('viewSourceBtn').addEventListener('click', () => {
        if (rawJsonContent) {
            const codeElement = document.createElement('pre');
            codeElement.innerHTML = `<code id="sourceCodeView" class="language-json">${rawJsonContent}</code>`;
            new Modal({
                id: 'source-view-modal',
                title: '查看源码',
                content: codeElement.outerHTML,
                width: '80%',
                height: '80%'
            });
        } else {
            showToast('请先加载一个规则文件以查看源码。', 'warning');
        }
    });

    localFileInput.addEventListener('change', loadAndRenderRulesFromFile);

    document.body.addEventListener('click', async (e) => {
        if (e.target.id === 'add-spider-btn-modal') addSpider();
        if (e.target.id === 'add-parse-btn-modal') addParse();
        if (e.target.id === 'add-filter-btn-modal') addFilterRule();
        if (e.target.id === 'add-live-btn-modal') addLiveRule();
        
        if (e.target.id === 'modal-save-btn') saveModalChanges();
        if (e.target.classList.contains('select-api-btn-edit')) {
            const apiInput = e.target.closest('.input-with-buttons').querySelector('.details-input');
            if (apiInput) {
                openApiSelectorModal(apiInput);
            }
        }
        if (e.target.id === 'start-download-btn') startDownloadProcess();
        
        if (e.target.id === 'open-selected-file-btn') openSelectedServerFile();
        if (e.target.id === 'create-new-config-btn') {
            handleFileAction('new-config', '', '根目录'); // path为空代表根目录
        }

        // 选择爬虫 Jar 文件
        if (e.target.id === 'select-spider-btn') {
            openFileBrowser({
                mode: 'select',
                filter: 'jar|png|bmp|jpg|jpeg|gif',
                onSelect: (selectedPath) => {
                    const mainConfigUrl = jsonUrlInput.value.trim();
                    const pathParts = mainConfigUrl.split(`/${window.APP_CONFIG.DEFAULT_SAVE_PATH}/`);
                    let mainConfigDir = '';
                    if (pathParts.length > 1) {
                        const fullPath = pathParts[1];
                        const lastSlashIndex = fullPath.lastIndexOf('/');
                        if (lastSlashIndex !== -1) {
                            mainConfigDir = fullPath.substring(0, lastSlashIndex + 1);
                        }
                    }

                    let relativePath;
                    if (mainConfigDir && selectedPath.startsWith(mainConfigDir)) {
                        relativePath = './' + selectedPath.substring(mainConfigDir.length);
                    } else {

                        relativePath = './' + selectedPath;
                    }

                    const spiderInput = document.getElementById('spider-url');
                    if (spiderInput) {
                        spiderInput.value = relativePath;
                    }
                }
            });
        }

        /** @description 监听 "选择" Jar 文件按钮 （服务器内选中）*/
        if (e.target.classList.contains('select-jar-btn')) {
            const container = e.target.closest('.input-with-buttons');
            const jarUrlInput = container.querySelector('textarea, input');

            openFileBrowser({
                mode: 'select',
                filter: 'jar',
                onSelect: (selectedPath) => {
                    const mainConfigUrl = jsonUrlInput.value.trim();
                    const pathParts = mainConfigUrl.split(`/${window.APP_CONFIG.DEFAULT_SAVE_PATH}/`);
                    let mainConfigDir = '';
                    if (pathParts.length > 1) {
                        const fullPath = pathParts[1];
                        const lastSlashIndex = fullPath.lastIndexOf('/');
                        if (lastSlashIndex !== -1) {
                            mainConfigDir = fullPath.substring(0, lastSlashIndex + 1);
                        }
                    }

                    let relativePath;
                    if (mainConfigDir && selectedPath.startsWith(mainConfigDir)) {
                        relativePath = './' + selectedPath.substring(mainConfigDir.length);
                    } else {
                        relativePath = './' + selectedPath;
                    }
                    
                    if (jarUrlInput) {
                        jarUrlInput.value = relativePath;
                    }
                }
            });
        }

        /** @description 监听 "上传" Jar 文件按钮 (本地上传)*/
        if (e.target.classList.contains('upload-jar-btn')) {
            const container = e.target.closest('.input-with-buttons');
            const fileInput = container.querySelector('.jar-file-input');
            const jarUrlInput = container.querySelector('textarea, input');

            // 检查是否已加载本地配置文件，这是上传的前提
            const savePathDir = window.APP_CONFIG.DEFAULT_SAVE_PATH;
            const urlPathSegment = `/${savePathDir}/`;
            if (!jsonUrlInput.value.includes(urlPathSegment)) {
                showToast('请先将主配置下载到本地后再上传资源', 'error');
                return;
            }
            
            // 每次点击都清空之前的事件监听，防止重复触发
            fileInput.onchange = null;
            
            // 为文件选择添加一次性的 change 事件监听器
            fileInput.onchange = async () => {
                if (fileInput.files.length === 0) return;

                const formData = new FormData();
                formData.append('jarFile', fileInput.files[0]);

                const configRelativePath = jsonUrlInput.value.split(urlPathSegment)[1];
                formData.append('configPath', configRelativePath);
                
                showToast('正在上传 Jar 文件...', 'info');
                try {
                    const response = await fetch('index.php/Proxy/uploadJar', {
                        method: 'POST',
                        body: formData
                    });
                    const result = await response.json();

                    if (result.success) {
                        showToast(result.message, 'success');
                        if(jarUrlInput) jarUrlInput.value = result.filePath;
                    } else {
                        throw new Error(result.message);
                    }
                } catch (err) {
                    showToast(`上传失败: ${err.message}`, 'error');
                } finally {
                    // 清空文件选择，以便可以重复上传同一个文件
                    fileInput.value = '';
                }
            };

            // 触发文件选择框
            fileInput.click();
        }

        /** @description 处理历史记录项的点击 */
        if (e.target && e.target.classList.contains('history-item')) {
            const url = e.target.dataset.url;
            jsonUrlInput.value = url;
            closeModalById('history-modal');

            loadAndRenderRulesFromUrl();
        }

        /** @description 处理清空历史记录按钮的点击 */
        if (e.target && e.target.id === 'clearHistoryBtn') {
            localStorage.removeItem('urlHistory');
            const historyList = document.getElementById('historyList');
            if (historyList) {
                historyList.innerHTML = '<li>历史记录已清空。</li>';
            }
            showToast('历史记录已清空', 'success');
        }
        
        /**
         * @description 处理推送到TVBox的请求
         * @param {string} action - 要执行的动作 (test_connection, push_config, search)
         * @param {string} payload - 附加数据 (URL或关键字)
         * @param {string} tvboxIp - TVBox的接口地址
         */
        const handlePush = async (action, payload, tvboxIp) => {
            const formData = new FormData();
            formData.append('tvboxUrl', tvboxIp);
            formData.append('action', action);
            formData.append('payload', payload);
            
            const toastMessage = action === 'test_connection' ? '正在测试连接...' : '正在发送命令...';
            showToast(toastMessage, 'info');

            try {
                const response = await fetch('index.php/Proxy/pushToTvbox', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    showToast(result.message || '命令已成功发送！', 'success');
                    localStorage.setItem('tvbox_push_ip', tvboxIp);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showToast(`发送失败: ${error.message}`, 'error');
            }
        };
        
        if (e.target.id === 'push-test-btn') {
            const tvboxIp = document.getElementById('push-tvbox-ip').value.trim();
            if (!tvboxIp) {
                showToast('请输入TvBox接口地址！', 'warning');
                return;
            }
            await handlePush('test_connection', '', tvboxIp);
        }
        if (e.target.id === 'push-confirm-btn') {
            const tvboxIp = document.getElementById('push-tvbox-ip').value.trim();
            const configUrl = document.getElementById('push-config-url').value.trim();
            if (!tvboxIp || !configUrl) return;
            await handlePush('push_config', configUrl, tvboxIp);
        }
        if (e.target.id === 'push-search-btn') {
            const tvboxIp = document.getElementById('push-tvbox-ip').value.trim();
            const keyword = document.getElementById('push-search-keyword').value.trim();
            if (!tvboxIp || !keyword) return;
            await handlePush('search', keyword, tvboxIp);
        }
        
        if (e.target.id === 'encrypt-config-btn') {
            const url = jsonUrlInput.value.trim();
            const savePathDir = window.APP_CONFIG.DEFAULT_SAVE_PATH;
            const urlPathSegment = `/${savePathDir}/`;

            if (!url.startsWith(window.location.origin) || !url.includes(urlPathSegment)) {
                showToast('错误：只能对保存在服务器上的文件进行加密。', 'error');
                return;
            }

            const relativePath = url.split(urlPathSegment)[1];
            if (!relativePath) {
                showToast('无法从URL中解析出有效的文件路径！', 'error');
                return;
            }

            // showToast('正在请求加密...', 'info');
            try {
                const formData = new FormData();
                formData.append('path', relativePath);

                const response = await fetch('index.php/Proxy/encryptConfig', {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.success) {
                    await showDialog({
                        type: 'alert',
                        title: '加密成功',
                        message: `
                            <p>加密后的文件链接如下，单击即可全选：</p>
                            <textarea
                                      onclick="this.select();" 
                                      style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; font-size: 14px; background-color: #f9f9f9; resize: none; box-sizing: border-box;">${result.encryptedUrl}</textarea>
                        `,
                        okText: '关闭'
                    });

                    if (document.getElementById('file-browser-modal')) {
                        refreshFileBrowser(null, getExpandedPaths());
                    }
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                showToast(`加密失败: ${error.message}`, 'error');
            }
        }
        
        if (e.target.id === 'filter-sites-btn') {
            const sites = currentRulesData.sites || [];
            if (sites.length === 0) {
                showToast('当前没有可供筛选的爬虫规则。', 'info');
                return;
            }

            const uniqueApis = [...new Set(sites.map(site => site.api).filter(Boolean))];
            if (uniqueApis.length === 0) {
                showToast('当前规则中没有可供筛选的爬虫接口(api)。', 'info');
                return;
            }

            let standardApis = [];
            let otherApisExist = false;
            
            uniqueApis.forEach(api => {
                if (api.startsWith('csp_') || api.endsWith('.js') || api.endsWith('.py')) {
                    standardApis.push(api);
                } else {
                    otherApisExist = true;
                }
            });
            
            let dialogContentHtml = `
                <div class="form-group" style="margin-bottom: 10px;">
                    <input type="text" id="api-search-input" placeholder="输入接口名进行搜索..." style="padding: 6px 10px; font-size: 14px;">
                </div>
                <div class="api-filter-grid">`;
            
            let apiButtonsHtml = '';
            apiButtonsHtml += `<button class="btn secondary-btn" data-api-filter="*">显示全部</button>`;
            if (otherApisExist) {
                apiButtonsHtml += `<button class="btn secondary-btn" data-api-filter="__others__">其他接口</button>`;
            }
            standardApis.forEach(api => {
                apiButtonsHtml += `<button class="btn secondary-btn" data-api-filter="${api}">${api}</button>`;
            });

            dialogContentHtml += apiButtonsHtml + '</div>';
            
            try {
                showDialog({
                    type: 'alert',
                    title: '按爬虫接口筛选',
                    message: dialogContentHtml,
                    okText: '关闭'
                });

                setTimeout(() => {
                    const grid = document.querySelector('.api-filter-grid');
                    if (!grid) return;
                    const buttons = grid.querySelectorAll('button');
                    const searchInput = document.getElementById('api-search-input');

                    if (searchInput) {
                        searchInput.addEventListener('input', () => {
                            const searchTerm = searchInput.value.toLowerCase();
                            buttons.forEach(button => {
                                const apiName = button.dataset.apiFilter;
                                if (apiName && apiName.toLowerCase().includes(searchTerm)) {
                                    button.style.display = '';
                                } else {
                                    button.style.display = 'none';
                                }
                            });
                        });
                    }
                    
                    buttons.forEach(button => {
                        if (button.scrollWidth > button.clientWidth) {
                            button.classList.add('has-marquee');
                            const text = button.textContent;
                            button.innerHTML = `<div class="marquee-wrapper"><div class="marquee-text">${text}</div></div>`;
                        }
                    });
                }, 0);
                
                document.body.querySelector('.dialog-overlay').addEventListener('click', (event) => {
                    const filterBtn = event.target.closest('[data-api-filter]');
                    if (filterBtn) {
                        const filterValue = filterBtn.dataset.apiFilter;
                        const allSiteItems = document.querySelectorAll('#sites .rule-item-container');
                        
                        let filterToastMessage = '';
                        allSiteItems.forEach(item => {
                            const siteData = currentRulesData.sites[parseInt(item.dataset.index, 10)];
                            if (!siteData) return;

                            let isMatch = false;
                            if (filterValue === '*') {
                                isMatch = true;
                                filterToastMessage = '已显示全部规则';
                            } else if (filterValue === '__others__') {
                                isMatch = !(siteData.api && (siteData.api.startsWith('csp_') || siteData.api.endsWith('.js') || siteData.api.endsWith('.py')));
                                filterToastMessage = '已筛选：其他接口';
                            } else {
                                isMatch = siteData.api === filterValue;
                                filterToastMessage = `已筛选：${filterValue}`;
                            }
                            if (isMatch) {
                                item.style.display = '';
                            } else {
                                item.style.display = 'none';
                            }
                        });

                        if(filterToastMessage) {
                            showToast(filterToastMessage, 'success');
                        }

                        const closeBtn = document.querySelector('.dialog-overlay .ok-btn');
                        if (closeBtn) closeBtn.click();
                    }
                });

            } catch (err) {
            }
            return;
        }

        const dirHeader = e.target.closest('.file-list-item.is-dir .file-info-section');
        if (dirHeader) {
            const parentLi = dirHeader.closest('li.dir');
            if (parentLi) {
                parentLi.classList.toggle('collapsed');
                const icon = dirHeader.querySelector('.toggle-icon');
                if (icon) icon.textContent = parentLi.classList.contains('collapsed') ? '+' : '−';
            }
        }
        
        const boolSetter = e.target.closest('.bool-setter');
        if(boolSetter){
            const input = document.getElementById(boolSetter.dataset.targetId);
            if (input) {
                input.value = boolSetter.dataset.value;
            }
        }

        const siteFilterBtn = e.target.closest('.site-filter-btn');
        if (siteFilterBtn) {
            applySiteFilter(siteFilterBtn);
        }

        if (e.target.id === 'toggle-custom-content-btn') {
            const ruleLinkInput = document.getElementById('new-site-ext-modal');
            const ruleLinkValue = ruleLinkInput ? ruleLinkInput.value.trim() : '';
            
            if (ruleLinkValue.startsWith('http://') || ruleLinkValue.startsWith('https://')) {
                showToast('“内容”功能仅适用于创建本地相对路径规则文件。', 'warning');
                return;
            }

            const wrapper = document.getElementById('custom-content-wrapper');
            if (wrapper) {
                const isHidden = wrapper.style.display === 'none';
                wrapper.style.display = isHidden ? 'block' : 'none';
                e.target.textContent = isHidden ? '收起' : '内容';
            }
        }
        
        const fileActionBtn = e.target.closest('.file-action-btn');
        if (fileActionBtn) {
            const action = fileActionBtn.dataset.action;
            const li = fileActionBtn.closest('li[data-path]');
            const path = li.dataset.path;
            const name = li.dataset.name;
            handleFileAction(action, path, name);
        }

        const deleteAllBtn = e.target.closest('.delete-all-btn');
        if (deleteAllBtn) {
            const itemType = deleteAllBtn.dataset.itemType;
            if (!itemType || !currentRulesData[itemType]) return;
            
            const entityNames = { sites: '爬虫规则', parses: '解析接口', lives: '直播源', rules: '过滤规则' };
            const entityName = entityNames[itemType] || '项目';

            try {
                await showDialog({
                    type: 'confirm',
                    title: '危险操作确认',
                    message: `您确定要清空所有【${entityName}】吗？此操作不可撤销。`
                });

                const container = document.getElementById(itemType);
                container.querySelectorAll('.rule-item-container').forEach(item => {
                    item.classList.add('shake-on-delete');
                    setTimeout(() => item.classList.remove('shake-on-delete'), 800);
                });

                setTimeout(() => {
                    currentRulesData[itemType] = [];
                    if (itemType === 'parses') currentRulesData.flags = [];
                    if (itemType === 'rules') currentRulesData.ads = [];
                    renderAllTabs(currentRulesData);
                    showToast(`所有${entityName}已清空！`, 'success');
                }, 100);

            } catch (error) {
                showToast('操作已取消', 'info');
            }
        }
        
        if (e.target.id === 'paste-rule-btn') {
            try {
                let internalClipboardItems = [];
                const internalClipboardRaw = localStorage.getItem('global_rule_clipboard');
                if (internalClipboardRaw) {
                    try {
                        const parsed = JSON.parse(internalClipboardRaw);
                        if (Array.isArray(parsed)) {
                            internalClipboardItems = parsed;
                        }
                    } catch (e) { }
                }

                const modalContent = templates.pasteModal({ internalClipboardRules: internalClipboardItems });

                const pasteModal = new Modal({
                    title: '粘贴规则',
                    content: modalContent,
                    id: 'paste-rule-modal',
                    width: '400px',
                    height: '500px',
                    showMin: false,
                    showMax: false,
                    showFull: false,
                    footer: `
                        <button class="btn secondary-btn" onclick="closeModalById('paste-rule-modal')">取消</button>
                        <button class="btn primary-btn" id="confirm-manual-paste-btn">确认粘贴</button>
                    `
                });

                const modalBody = pasteModal.getBodyElement();
                const modalFooter = pasteModal.getFooterElement();

                modalBody.addEventListener('click', async (event) => {
                    const target = event.target.closest('.paste-internal-item-btn');
                    if (!target) return;

                    event.preventDefault();
                    
                    const index = parseInt(target.getAttribute('data-index'), 10);
                    const itemIndex = internalClipboardItems.findIndex((item, idx) => idx === index);

                    if (itemIndex === -1) {
                        showToast('要粘贴的规则无效或已改变！', 'error');
                        return;
                    }
                    const itemToPaste = internalClipboardItems[itemIndex];

                    showToast('正在粘贴规则并处理资源文件...', 'info');
                    const newRule = JSON.parse(JSON.stringify(itemToPaste.data));

                    let keyExists = currentRulesData.sites.some(site => site.key === newRule.key);
                    let nameExists = currentRulesData.sites.some(site => site.name === newRule.name);
                    while (keyExists || nameExists) {
                        newRule.name += '_复制';
                        newRule.key += '_copy';
                        keyExists = currentRulesData.sites.some(site => site.key === newRule.key);
                        nameExists = currentRulesData.sites.some(site => site.name === newRule.name);
                    }

                    try {
                        for (const key of ['ext', 'jar', 'api']) {
                            const assetPath = newRule[key];
                            if (assetPath && typeof assetPath === 'string' && assetPath.startsWith('./')) {
                                const formData = new FormData();
                                formData.append('sourceBasePath', itemToPaste.sourceBaseDir);
                                formData.append('targetBasePath', currentConfigBaseDir);
                                formData.append('assetRelativePath', assetPath);
                                const response = await fetch('index.php/Proxy/copyAsset', { method: 'POST', body: formData });
                                const result = await response.json();
                                if (!result.success) throw new Error(`复制资源 ${assetPath} 失败: ${result.message}`);
                            }
                        }
                        currentRulesData.sites.unshift(newRule);
                        renderSitesTab(currentRulesData.sites);
                        showToast(`规则 “${newRule.name}” 已成功粘贴！`, 'success');
                        
                        internalClipboardItems.splice(itemIndex, 1);
                        localStorage.setItem('global_rule_clipboard', JSON.stringify(internalClipboardItems));

                        if (internalClipboardItems.length > 0) {
                            const listItem = target.closest('li');
                            if (listItem) {
                                listItem.style.transition = 'opacity 0.3s, transform 0.3s';
                                listItem.style.opacity = '0';
                                listItem.style.transform = 'scale(0.95)';
                                setTimeout(() => {
                                    listItem.remove();
                                    const remainingItems = modalBody.querySelectorAll('.paste-internal-item-btn');
                                    remainingItems.forEach((btn, newIndex) => {
                                        btn.setAttribute('data-index', newIndex);
                                    });
                                }, 300);
                            }
                        } else {
                            pasteModal.close();
                        }

                    } catch (assetError) {
                        showToast(`粘贴失败: ${assetError.message}`, 'error');
                    }
                });

                const manualPasteBtn = modalFooter.querySelector('#confirm-manual-paste-btn');
                manualPasteBtn.addEventListener('click', () => {
                    const textarea = modalBody.querySelector('#paste-content-textarea');
                    if (!textarea || !textarea.value.trim()) {
                        pasteModal.close();
                        return;
                    }
                    
                    const pastedText = textarea.value.trim();
                    let rulesToAdd = [];
                    try {
                        const parsedData = JSON.parse(pastedText);
                        if (Array.isArray(parsedData)) rulesToAdd = parsedData;
                        else if (typeof parsedData === 'object' && parsedData !== null) rulesToAdd.push(parsedData);
                    } catch (e) {
                        showToast('粘贴的内容不是有效的JSON格式！', 'error'); return;
                    }

                    if (rulesToAdd.length === 0) {
                        showToast('未能从粘贴内容中解析出有效规则。', 'info'); return;
                    }
                    
                    let addedCount = 0;
                    for (let i = rulesToAdd.length - 1; i >= 0; i--) {
                        const rule = rulesToAdd[i];
                        if (rule && rule.key && rule.name) {
                            const newRule = JSON.parse(JSON.stringify(rule));
                            let keyExists = currentRulesData.sites.some(site => site.key === newRule.key);
                            let nameExists = currentRulesData.sites.some(site => site.name === newRule.name);
                            while (keyExists || nameExists) {
                                newRule.name += '_复制'; newRule.key += '_copy';
                                keyExists = currentRulesData.sites.some(site => site.key === newRule.key);
                                nameExists = currentRulesData.sites.some(site => site.name === newRule.name);
                            }
                            currentRulesData.sites.unshift(newRule);
                            addedCount++;
                        }
                    }

                    if (addedCount > 0) {
                        renderSitesTab(currentRulesData.sites);
                        showToast(`成功粘贴了 ${addedCount} 条规则！`, 'success');
                    }
                    
                    pasteModal.close();
                });

            } catch (error) {
                console.error("创建粘贴对话框时出错:", error);
                showToast('准备粘贴时出错。', 'error');
            }
        }

        
        const createNewBtn = e.target.closest('.create-new-btn');
        if (createNewBtn) {
            const itemType = createNewBtn.dataset.itemType;
            if (itemType === 'sites') {
                new Modal({
                    id: 'add-site-modal',
                    title: '新增爬虫规则',
                    content: templates.addSiteModal(),
                    footer: '<button id="add-spider-btn-modal" class="btn primary-btn">添加</button>'
                });

                setTimeout(() => {
                    const addSiteModalElement = document.getElementById('add-site-modal');
                    if(addSiteModalElement) {
                        const nameInput = addSiteModalElement.querySelector('#new-site-name-modal');
                        const apiInput = addSiteModalElement.querySelector('#new-site-api-modal');
                        const keyInput = addSiteModalElement.querySelector('#new-site-key-modal');
                        const label = addSiteModalElement.querySelector('label[for="save-as-default-toggle-modal"]');
                        
                        const updateDynamicFields = () => {
                            const name = nameInput.value.trim();
                            const api = apiInput.value.trim();
                            if (name || api) {
                                keyInput.value = md5(`${Date.now()}${name}${api}`, { pretty: true });
                            } else {
                                keyInput.value = '';
                            }
                            if (label) {
                                label.textContent = api ? `将以上内容保存为 ${api} 的默认模板` : '将以上内容保存为该接口的默认模板';
                            }
                        };
                        
                        nameInput.addEventListener('input', updateDynamicFields);
                        apiInput.addEventListener('input', updateDynamicFields);
                        updateDynamicFields();
                    }
                }, 0);

            } else if (itemType === 'parses') {
                new Modal({
                    id: 'add-parse-modal',
                    title: '新增解析接口',
                    content: templates.addParseModal(),
                    footer: '<button id="add-parse-btn-modal" class="btn primary-btn">添加</button>'
                });
            } else if (itemType === 'rules') {
                 new Modal({
                    id: 'add-filter-modal',
                    title: '新增过滤规则',
                    content: templates.addFilterModal(),
                    footer: '<button id="add-filter-btn-modal" class="btn primary-btn">添加</button>'
                });
            } else if (itemType === 'lives') {
                new Modal({
                    id: 'add-live-modal',
                    title: '新增直播源',
                    content: templates.addLiveModal(),
                    footer: '<button id="add-live-btn-modal" class="btn primary-btn">添加</button>'
                });
            }
        }
    });

    /**
     * @description 推送按钮绑定
     */

    document.getElementById('pushBtn').addEventListener('click', () => {
        const pushModal = new Modal({
            id: 'push-modal',
            title: '推送至TVBox',
            content: templates.pushModal(),
        });
        
        setTimeout(() => {
            const configUrlInput = document.getElementById('push-config-url');
            const tvboxIpInput = document.getElementById('push-tvbox-ip');
            if(configUrlInput) configUrlInput.value = jsonUrlInput.value;
            if(tvboxIpInput) tvboxIpInput.value = localStorage.getItem('tvbox_push_ip') || '';
        }, 0);
    });

    /**
     * @description 为“新增爬虫规则”弹窗添加动态交互
     */
    if (document.body.querySelector('#add-site-modal')) {
        const addSiteModalElement = document.body.querySelector('#add-site-modal');
        const nameInput = addSiteModalElement.querySelector('#new-site-name-modal');
        const apiInput = addSiteModalElement.querySelector('#new-site-api-modal');
        const keyInput = addSiteModalElement.querySelector('#new-site-key-modal');
        const label = addSiteModalElement.querySelector('label[for="save-as-default-toggle-modal"]');
        
        const updateDynamicFields = () => {
            const name = nameInput.value.trim();
            const api = apiInput.value.trim();

            if (name || api) {
                const timestamp = Date.now();
                const uniqueString = `${timestamp}${name}${api}`;
                keyInput.value = md5(uniqueString, { pretty: true });
            } else {
                keyInput.value = '';
            }

            if (label) {
                if (api) {
                    label.textContent = `将以上内容保存为 ${api} 的默认模板`;
                } else {
                    label.textContent = '将以上内容保存为该接口的默认模板';
                }
            }
        };
        
        addSiteModalElement.addEventListener('input', (e) => {
            if (e.target === nameInput || e.target === apiInput) {
                updateDynamicFields();
            }
        });

        updateDynamicFields();
    }

    /**
     * @description 打开API选择器弹窗，并处理内部所有事件
     */
    function openApiSelectorModal(targetInput) {
        let currentPage = 1;
        let totalPages = 1;
        let isLoading = false;
        let currentSearch = '';

        const dialogContentHtml = `
            <div class="form-group" style="margin-bottom: 10px;">
                <input type="text" id="api-search-input" placeholder="输入接口名进行搜索..." style="padding: 6px 10px; font-size: 14px;">
            </div>
            <div class="api-filter-grid" id="api-selector-list" style="max-height: 45vh;"></div>
        `;

        showDialog({
            type: 'alert',
            title: '选择爬虫接口',
            message: dialogContentHtml,
            okText: '关闭'
        }).catch(() => {});

        const dialogOverlay = document.body.querySelector('.dialog-overlay');
        const listContainer = document.getElementById('api-selector-list');
        const searchInput = document.getElementById('api-search-input');
        
        
        const fetchApiList = async (page, search = '') => {
            if (isLoading || (page > 1 && page > totalPages)) return;
            isLoading = true;
            if (page === 1) listContainer.innerHTML = '<div class="loading-spinner"></div>';

            try {
                const response = await fetch(`index.php/Proxy/getApiList?page=${page}&search=${encodeURIComponent(search)}`);
                const result = await response.json();
                if (result.success) {
                    if (page === 1) listContainer.innerHTML = '';
                    totalPages = result.totalPages;
                    result.data.forEach(api => {
                        const button = document.createElement('button');
                        button.className = 'btn secondary-btn';
                        button.dataset.apiName = api;
                        button.textContent = api;
                        listContainer.appendChild(button);
                    });
                    currentPage++;
                }
            } catch (e) {
                listContainer.innerHTML = '加载列表失败。';
            } finally {
                isLoading = false;
            }
        };

        listContainer.addEventListener('scroll', () => {
            if (listContainer.scrollTop + listContainer.clientHeight >= listContainer.scrollHeight - 10) {
                fetchApiList(currentPage, currentSearch);
            }
        });
        
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                totalPages = 1;
                currentSearch = searchInput.value;
                listContainer.scrollTop = 0;
                fetchApiList(currentPage, currentSearch);
            }, 300);
        });

        if (dialogOverlay) {
            dialogOverlay.addEventListener('click', (e) => {
                const selectedApiBtn = e.target.closest('[data-api-name]');
                if (selectedApiBtn && targetInput) {
                    targetInput.value = selectedApiBtn.dataset.apiName;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    const closeBtn = dialogOverlay.querySelector('.ok-btn');
                    if (closeBtn) closeBtn.click();
                }
            });
        }

        fetchApiList(1, '');
    }
    
    /**
     * @description 统一处理文件管理器的各种操作（增删改、上传等）
     * @param {string} action - 操作类型
     * @param {string} path - 目标文件或目录的相对路径
     * @param {string} name - 目标文件或目录的名称
     */
    async function handleFileAction(action, path, name) {
        let result;
        const encodedConfig = 'Ly8gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKgovLyAqCi8vICogICDmraTphY3nva7mlofku7bnlLEgVFZCb3gg6KeE5YiZ5aSn5biIIChUVkJveCBSdWxlIE1hc3Rlcikg55Sf5oiQCi8vICogICDkvZzogIU6IGh0dHBzOi8vdC5tZS9DQ2ZvcmsKLy8gKiAgIOS6pOa1gee+pDogaHR0cHM6Ly90Lm1lL1RWQm94UnVsZU1hc3RlckJ1ZwovLyAqICAg6aG555uu5Zyw5Z2AOiBodHRwczovL2dpdGh1Yi5jb20veE15ZGV2L1RWQm94UnVsZU1hc3RlcgovLyAqICAg55Sf5oiQ5pe26Ze0OiB7dH0KLy8gKgovLyAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqCnsKICAic3BpZGVyIjogIiIsCiAgInNpdGVzIjogWwogICAgewogICAgICAia2V5IjogIlNwaWRlciIsCiAgICAgICJuYW1lIjogIuiHquWKqOmHh+mbhiIsCiAgICAgICJhcGkiOiAiaHR0cDovL3lvdXJkb21haW4uY29tL2F1dG9fc3BpZGVyX2NhdHZvZC5waHAiLAogICAgICAidHlwZSI6IDEsCiAgICAgICJzZWFyY2hhYmxlIjogMSwKICAgICAgImNoYW5nZWFibGUiOiAxLAogICAgICAicXVpY2tTZWFyY2giOiAxLAogICAgICAiZmlsdGVyYWJsZSI6IDEKICAgIH0KICBdLAogICJwYXJzZXMiOiBbCiAgICB7CiAgICAgICJuYW1lIjogIuWGhee9ruWXheaOoiIsCiAgICAgICJ0eXBlIjogMCwKICAgICAgInVybCI6ICIiLAogICAgICAiZXh0IjogewogICAgICAgICJmbGFnIjogWyJzbmlmZiIsICLll4XmjqIiXQogICAgICB9CiAgICB9LAogICAgewogICAgICAibmFtZSI6ICLpgJrnlKjop6PmnpAiLAogICAgICAidHlwZSI6IDEsCiAgICAgICJ1cmwiOiAiaHR0cHM6Ly9qeC5leGFtcGxlLmNvbS8/dXJsPSIsCiAgICAgICJleHQiOiB7CiAgICAgICAgImZsYWciOiBbImNvbW1vbiIsICLpgJrnlKgiLCAi6Kej5p6QIl0KICAgICAgfQogICAgfQogIF0sCiAgImxpdmVzIjogWwogICAgewogICAgICAibmFtZSI6ICLmiJHnmoTnm7Tmkq0iLAogICAgICAidHlwZSI6IDAsCiAgICAgICJ1cmwiOiAiaHR0cHM6Ly9saXZlLmV4YW1wbGUuY29tL3BsYXlsaXN0LnR4dCIsCiAgICAgICJwbGF5ZXJUeXBlIjogMSwKICAgICAgInVhIjogIm9raHR0cC8zLjEyLjEzIgogICAgfQogIF0sCiAgInJ1bGVzIjogW10sCiAgImFkcyI6IFtdLAogICJ3YWxscGFwZXIiOiAiIiwKICAicHJveHkiOiBbCiAgICB7CiAgICAgICJuYW1lIjogIumAmueUqOS7o+eQhiIsCiAgICAgICJob3N0cyI6IFsKICAgICAgICAicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIKICAgICAgXSwKICAgICAgInVybHMiOiBbCiAgICAgICAgImh0dHA6Ly8xMjcuMC4wLjE6Nzg5MCIKICAgICAgXQogICAgfQogIF0sCiAgImhvc3RzIjogWwogICAgIm9sZC5kb21haW4uY29tPW5ldy5kb21haW4uY29tIgogIF0KfQo=';

        const decodedConfigTemplate = decodeBase64Utf8(encodedConfig);
        const emptyConfigContent = decodedConfigTemplate.replace('{t}', getFormattedLocalTime());


        const expandedPaths = getExpandedPaths();

        const performFetch = async (url, body) => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await response.json();
                if (data.success) {
                    showToast(data.message || `${action} 操作成功!`, 'success');
                    return true;
                } else {
                    throw new Error(data.message || '操作失败');
                }
            } catch (error) {
                showToast(error.message, 'error');
                return false;
            }
        };

        switch(action) {
            case 'rename':
                result = await showDialog({ type: 'prompt', title: '重命名', message: `请输入新的名称:`, inputValue: name });
                if (result) {
                    if (await performFetch('index.php/Proxy/renameItem', { path, newName: result })) {
                        await refreshFileBrowser(null, expandedPaths);
                    }
                }
                break;
            case 'delete':
                try {
                    await showDialog({ type: 'confirm', title: '确认删除', message: `确定要删除 "${name}" 吗？此操作不可恢复!` });
                    if (await performFetch('index.php/Proxy/deleteItem', { path })) {
                        expandedPaths.delete(path);
                        await refreshFileBrowser(null, expandedPaths);
                    }
                } catch(e) { }
                break;
            case 'new-file':
                result = await showDialog({ type: 'prompt', title: '新建文件', message: `在 "${name}" 中新建文件:`, inputValue: '', placeholder: '支持多级路径, 如 a/b/c.txt' });
                if (result) {
                    if (await performFetch('index.php/Proxy/createFile', { path, fileName: result, content: '' })) {
                        expandedPaths.add(path);
                        await refreshFileBrowser(null, expandedPaths);
                    }
                }
                break;
            case 'new-config':
                result = await showDialog({ type: 'prompt', title: '新建配置', message: `请输入新配置文件名:`, inputValue: 'config.json', placeholder: '支持多级路径, 如 a/b/m.json' });
                if (result) {
                    if (await performFetch('index.php/Proxy/createFile', { path: '', fileName: result, content: emptyConfigContent })) {
                        await refreshFileBrowser(null, expandedPaths);
                    }
                }
                break;
            case 'new-dir':
                result = await showDialog({ type: 'prompt', title: '新建目录', message: `在 "${name}" 中新建目录:`, inputValue: '', placeholder: '支持多级路径, 如 a/b/c' });
                if (result) {
                    if (await performFetch('index.php/Proxy/createDirectory', { path, dirName: result })) {
                        expandedPaths.add(path);
                        await refreshFileBrowser(null, expandedPaths);
                    }
                }
                break;
            case 'upload':
                uploadFileInput.setAttribute('data-expanded-paths', JSON.stringify([...expandedPaths]));
                uploadFileInput.setAttribute('data-target-dir', path);
                uploadFileInput.click();
                break;
        }
    }

    // uploadFileInput change 事件监听器
    uploadFileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        const targetDir = e.target.getAttribute('data-target-dir');
        // 从属性中恢复展开路径
        const expandedPathsAttr = e.target.getAttribute('data-expanded-paths');
        const expandedPaths = new Set(expandedPathsAttr ? JSON.parse(expandedPathsAttr) : []);

        if (!files.length || !targetDir) return;

        expandedPaths.add(targetDir); // 确保上传目录保持展开

        const formData = new FormData();
        formData.append('targetDir', targetDir);
        for (const file of files) {
            formData.append('files[]', file);
        }

        showToast(`正在上传 ${files.length} 个文件...`, 'info');
        try {
            const response = await fetch('index.php/Proxy/uploadFiles', { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                await refreshFileBrowser(null, expandedPaths);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            showToast(`上传失败: ${error.message}`, 'error');
        } finally {
            uploadFileInput.value = '';
            uploadFileInput.removeAttribute('data-expanded-paths');
        }
    });


    /**
     * @description 为“新增爬虫规则”弹窗添加事件
     */
    if (document.body.querySelector('#add-site-modal')) {
        document.body.querySelector('#add-site-modal').addEventListener('click', (e) => {
            if (e.target.id === 'select-api-btn') {
                const apiInput = document.getElementById('new-site-api-modal');
                openApiSelectorModal(apiInput);
            }
        });
    }    
    /**
     * @description 首页 Ctrl+S 保存快捷键
     */
    setupSaveShortcut(() => {
        const saveButton = document.getElementById('saveBtn');
        if (saveButton) {
            saveButton.click();
        }
    });
    
    loadAndRenderRulesFromUrl();
    updateGridColumns();
});