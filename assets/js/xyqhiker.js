/**
 * --------------------------------------------------------------------
 * @description XYQHiker规则编辑器核心脚本
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */

let currentInputEle;
let tempDetailPageUrl = '';
let testResultsCache = [];
let isHtmlMode = false;

/**
 * @description 解析JSON格式的规则内容并填充到表单中。
 * @param {string} content - 包含规则的JSON格式字符串。
 */
function parseAndRenderRules(content) {
    try {
        let cleanedContentLines = content.split('\n').filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('/*'));
        let cleanedContent = cleanedContentLines.join('\n');
        cleanedContent = cleanedContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        cleanedContent = cleanedContent.replace(/^\s*[\r\n]/gm, '');

        let rules;
        try {
            rules = JSON.parse(cleanedContent);
        } catch (err) {
            let aggressiveContent = cleanedContent.replace(/,\s*([}\]])/g, '$1');
            rules = JSON.parse(aggressiveContent);
        }

        fillForm(rules);
        showToast('规则内容加载成功！', 'success');
    } catch (error) {
        console.error('解析JSON文件失败:', error);
        showToast('规则内容加载失败，请检查文件格式。', 'error');
    }
}

/**
 * @description 页面加载完成后的主入口函数。
 */
document.addEventListener('DOMContentLoaded', () => {
    /**
     * @description DOM加载完毕后执行的匿名函数，负责初始化页面、实例化组件和绑定事件。
     */
    if (typeof XYQHikerFieldsData === 'undefined') {
        console.error('el.js 未能成功加载，无法渲染表单。');
        alert('核心数据文件 el.js 加载失败，请检查文件路径或网络连接。');
        return;
    }
    Handlebars.registerHelper('eq', (a, b) => a === b);

    /** @description 使用事件委托处理弹窗内的按钮点击 */
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'manualTestBtn') manualRunTest();
        if (event.target.id === 'applySelectorBtn') applySelectorToField();
        if (event.target.id === 'toggleSourceBtn') {
            const sourceTextarea = document.getElementById('sourceHtmlInput');
            if(sourceTextarea) sourceTextarea.style.display = sourceTextarea.style.display === 'none' ? 'block' : 'none';
        }
        if (event.target.id === 'toggleResultModeBtn') toggleResultMode();
    });

    document.getElementById('autoTestBtn').addEventListener('click', startAutomatedTest);
    
    document.getElementById('saveBtn').addEventListener('click', () => {
        if (!filePathFromServer) {
            showToast('文件路径未知，无法保存。', 'error');
            return;
        }
        
        const jsonData = collectFormDataIntoJson('ruleForm');
        const fileContent = JSON.stringify(jsonData, null, 2);

        const formData = new FormData();
        formData.append('filePath', filePathFromServer);
        formData.append('fileContent', fileContent);

        showToast('正在保存...', 'info');
        fetch('/index.php/Edit/save', {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast(result.message, 'success');
            } else {
                throw new Error(result.message);
            }
        })
        .catch(err => {
            showToast(`保存失败: ${err.message}`, 'error');
        });
    });

    document.getElementById('editBtn').addEventListener('click', 
        () => {
            const urlParams = new URLSearchParams(window.location.search);
            const file = urlParams.get('file');
            window.open('/index.php/Edit?file=' + file + '&api=editor', '_blank')
        }
    );

    document.addEventListener('input', (event) => {
        if (event.target.closest('#ruleForm') || event.target.closest('#testModal') || event.target.closest('#variableModal')) {
            if (event.target.id && event.target.id.startsWith('var-')) {
                return;
            }
            saveFormData('#ruleForm', 'tvbox_form_data');
        }
    });
    
    renderForm();
    
    if (typeof fileContentFromServer !== 'undefined' && fileContentFromServer && !fileContentFromServer.startsWith('错误：')) {
        parseAndRenderRules(fileContentFromServer);
    } else if (typeof fileContentFromServer !== 'undefined') {
        alert(fileContentFromServer);
    } else {
        loadFormData('#ruleForm', 'tvbox_form_data');
    }
    
    setupSaveShortcut(() => {
        const saveButton = document.getElementById('saveBtn');
        if (saveButton) {
            saveButton.click();
        }
    });
});

/**
 * @description 根据 XYQHikerFieldsData 渲染整个表单结构。
 */
function renderForm() {
    /**
     * @description 为字段定义准备按钮配置，包括标签和回调函数。
     * @param {Array<object>} fields - 原始字段定义数组。
     * @returns {Array<object>} 增加了按钮配置的新字段数组。
     */
    const prepareFieldsWithActions = (fields) => {
        if (!Array.isArray(fields)) return [];
        return fields.map(field => {
            const buttons = [];
            if (field.test_btn) {
                buttons.push({
                    label: '测试',
                    onClick: (fieldId) => openTestModal(fieldId)
                });
            }
            if (field.var_btn) {
                buttons.push({
                    label: '变量',
                    onClick: (fieldId, fieldDef) => toggleAccordion(fieldId, fieldDef.var_btn)
                });
            }
            return { ...field, buttons };
        });
    };

    /** @description 遍历数据源，渲染各个选项卡的内容 */
    for (const tabName in XYQHikerFieldsData) {
        if (tabName === 'category') {
            const categoryRules = prepareFieldsWithActions(XYQHikerFieldsData.category.rules);
            const categoryFilters = prepareFieldsWithActions(XYQHikerFieldsData.category.filters);
            renderFormFields('category-rules-basic', categoryRules);
            renderFormFields('category-filter-menu', categoryFilters);
        } else {
            const fields = prepareFieldsWithActions(XYQHikerFieldsData[tabName]);
            renderFormFields(tabName, fields);
        }
    }
}

/**
 * @description 切换高级/普通模式。
 */
function toggleAdvancedMode() {
    const body = document.body;
    const btn = document.getElementById('advancedModeBtn');
    const isActive = body.classList.toggle('advanced-mode-active');
    btn.classList.toggle('active', isActive);
    btn.innerText = isActive ? '高级模式' : '普通模式';
    localStorage.setItem('tvbox_advanced_mode', isActive);

    if (isActive) {
        showToast('已切换至高级模式', 'info');
    } else {
        showToast('已切换至普通模式', 'info');
    }
}

/**
 * @description 从localStorage加载高级模式状态。
 */
function loadAdvancedModeState() {
    const isActive = localStorage.getItem('tvbox_advanced_mode') === 'true';
    const body = document.body;
    const btn = document.getElementById('advancedModeBtn');
    if (isActive) {
        body.classList.add('advanced-mode-active');
        btn.classList.add('active');
        btn.innerText = '高级模式';
    } else {
        body.classList.remove('advanced-mode-active');
        btn.classList.remove('active');
        btn.innerText = '普通模式';
    }
}

/**
 * @description 切换分类页面下的子标签页。
 * @param {Event} evt - 点击事件对象。
 * @param {string} tabName - 要显示的目标子标签页内容ID。
 */
function openSubTab(evt, tabName) {
    const tabContents = document.querySelectorAll('#category .sub-tab-content');
    tabContents.forEach(tab => tab.style.display = "none");

    const tabButtons = document.querySelectorAll('#category .sub-tabs .sub-tab-btn');
    tabButtons.forEach(btn => btn.classList.remove("active"));

    const tabElement = document.getElementById(tabName);
    if (tabElement) {
        tabElement.style.display = "block";
    }
    evt.currentTarget.classList.add("active");
}

/**
 * @description 准备并打开测试弹窗。
 * @param {string} key - 触发测试的输入框ID。
 */
async function openTestModal(key) {
    currentInputEle = document.getElementById(key);
    if (!currentInputEle) {
        console.error("无法找到元素: ", key);
        return;
    }
    
    const fieldDef = findFieldDefinition(XYQHikerFieldsData, key);
    
    new Modal({
        id: 'testModal',
        title: '测试：' + (fieldDef ? fieldDef.key : 'CSS选择器'),
        content: renderTemplate('test-modal-template'),
        footer: '<button id="manualTestBtn" class="btn primary-btn">运行测试</button>',
        width: '700px',
        height: '80%'
    });

    /** @description 延迟以确保DOM元素已创建 */
    setTimeout(async () => {
        document.getElementById('testSelectorInput').value = currentInputEle.value;
        document.getElementById('testResultContent').innerHTML = '';
        const resultContainer = document.querySelector('.test-result-container');
        if(resultContainer) resultContainer.style.display = 'none';
        
        testResultsCache = [];
        isHtmlMode = false;
        document.getElementById('toggleResultModeBtn').innerText = '切换到HTML模式';

        const sourceInput = document.getElementById('sourceHtmlInput');
        if (sourceInput) {
            sourceInput.style.display = 'none';
            sourceInput.value = '';
        }

        let url = '';
        const parentTabContent = currentInputEle.closest('.tab-content, .sub-tab-content');
        if (parentTabContent) {
            const parentId = parentTabContent.id;
            if (parentId.startsWith('home')) {
                url = document.getElementById('首页推荐链接')?.value || '';
            } else if (parentId.startsWith('category')) {
                let categoryUrlTemplate = document.getElementById('分类链接')?.value || '';
                if (categoryUrlTemplate) {
                    url = categoryUrlTemplate.replace(/\[firstPage=.*?\]/, '');
                }
            } else if (parentId.startsWith('detail') || parentId.startsWith('play')) {
                if (!tempDetailPageUrl) {
                    // showToast('详情链接为空，正尝试自动获取...', 'info');
                    document.getElementById('testUrl').value = '正在自动获取链接...';
                    const categoryUrl = (document.getElementById('分类链接')?.value || '').replace(/\[firstPage=.*?\]/, '');
                    const listRule = document.getElementById('分类列表数组规则')?.value || '';
                    const linkRule = document.getElementById('分类片单链接')?.value || '';
                    const prefix = document.getElementById('分类片单链接加前缀')?.value || '';
                    const suffix = document.getElementById('分类片单链接加后缀')?.value || '';
                    if (!categoryUrl || !listRule || !linkRule) {
                        url = '自动获取失败: 分类相关规则未填写';
                        showToast(url, 'error');
                    } else {
                        const headers = parseHeaders(document.getElementById('请求头参数').value);
                        const listResult = await runTest(categoryUrl, listRule, null, headers);
                        if (listResult.success && listResult.extractedElements.length > 0) {
                            const contextHtml = listResult.extractedElements[0].outerHTML;
                            const linkResult = await runTest(null, linkRule, contextHtml, headers);
                            if (linkResult.success && linkResult.finalResult.length > 0) {
                                const linkPart = linkResult.finalResult[0];
                                tempDetailPageUrl = prefix + linkPart + suffix;
                                url = tempDetailPageUrl;
                                // showToast('已自动获取详情页链接！', 'success');
                            } else {
                                url = '自动获取失败: 未能从分类项中提取到链接';
                                showToast(url, 'error');
                            }
                        } else {
                            url = '自动获取失败: 未能在分类页找到列表';
                            showToast(url, 'error');
                        }
                    }
                } else {
                    url = tempDetailPageUrl;
                }
            } else if (parentId.startsWith('search')) {
                url = document.getElementById('搜索链接')?.value || '';
            }
        }
        
        document.getElementById('testUrl').value = url || '请手动输入URL';
    }, 100);
}

/**
 * @description 在测试弹窗中更新测试结果显示。
 * @param {object} result - runTest函数返回的结果对象。
 * @param {string} selector - 当前测试使用的选择器。
 * @param {string} url - 当前测试使用的URL或上下文描述。
 * @param {boolean} isAutomated - 是否为一键自动测试流程。
 */
function updateTestModalContent(result, selector, url, isAutomated) {
    const resultDiv = document.getElementById('testResultContent');
    const resultContainer = document.querySelector('.test-result-container');
    if(!resultDiv || !resultContainer) return;
    
    resultContainer.style.display = 'block';

    testResultsCache = [{
        extractedElements: result.extractedElements,
        finalResult: result.finalResult,
        selector: selector,
        url: url,
        isFinalResultDirect: result.isFinalResultDirect
    }];
    
    const infoDiv = document.createElement('div');
    if(resultDiv.innerHTML && !isAutomated){ 
        infoDiv.innerHTML = `<hr style="margin-top:15px; margin-bottom:15px;"><b>测试URL:</b> ${url}<br><b>CSS选择器:</b> `;
    } else {
        resultDiv.innerHTML = '';
        infoDiv.innerHTML = `<b>测试URL:</b> ${url}<br><b>CSS选择器:</b> `;
    }

    const selectorPre = document.createElement('pre');
    selectorPre.style.cssText = 'display: inline; padding: 2px 4px; background-color: #f0f0f0; border-radius: 3px;';
    selectorPre.innerText = selector;
    infoDiv.appendChild(selectorPre);
    resultDiv.appendChild(infoDiv);

    if (result.success) {
        const displayItems = result.isFinalResultDirect ? result.finalResult : result.extractedElements;
        
        if (displayItems && displayItems.length > 0) {
            const count = document.createElement('p');
            count.innerHTML = `<br><b>找到 ${displayItems.length} 个结果:</b>`;
            resultDiv.appendChild(count);
            
            displayItems.forEach(item => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'white-space: pre-wrap; word-break: break-all;';
                if (result.isFinalResultDirect) {
                    pre.innerText = item;
                } else {
                    pre.innerText = item.textContent ? item.textContent.trim() : '';
                }
                resultDiv.appendChild(pre);
            });
        } else {
            const noResult = document.createElement('p');
            noResult.innerHTML = `<br><b><span style="color:red;">未找到匹配的元素。</span></b>`;
            if (result.error) {
                noResult.innerHTML += `<br>错误信息: ${result.error}`;
            }
            resultDiv.appendChild(noResult);
        }
    } else {
        const errorMsg = document.createElement('p');
        errorMsg.innerHTML = `<br><b><span style="color:red;">测试失败:</span></b> ${result.error}`;
        resultDiv.appendChild(errorMsg);
    }
    if (isAutomated) {
        resultDiv.scrollTop = resultDiv.scrollHeight;
    }
}

/**
 * @description 执行手动测试。
 */
async function manualRunTest() {
    const url = document.getElementById('testUrl').value;
    const selector = document.getElementById('testSelectorInput').value;
    const resultDiv = document.getElementById('testResultContent');
    const resultContainer = document.querySelector('.test-result-container');
    if(!resultDiv || !resultContainer) return;

    const sourceHtmlInput = document.getElementById('sourceHtmlInput');
    const sourceHtml = sourceHtmlInput ? sourceHtmlInput.value : '';
    const isSourceHtmlVisible = sourceHtmlInput && sourceHtmlInput.style.display !== 'none';
    const hasSourceHtml = sourceHtml && sourceHtml.trim() !== '';

    if (isSourceHtmlVisible && hasSourceHtml) {
        resultDiv.innerHTML = '正在使用自定义源码进行测试...';
        resultContainer.style.display = 'block';
        const result = await runTest(null, selector, sourceHtml);
        updateTestModalContent(result, selector, '本地源码测试', false);
        return;
    }

    if (!url || !selector || url.includes('请') || url.includes('失败')) {
        resultDiv.innerHTML = 'URL和选择器都不能为空，或URL无效。';
        resultContainer.style.display = 'block';
        return;
    }

    resultDiv.innerHTML = '正在加载并测试，请稍候...';
    resultContainer.style.display = 'block';

    const fieldId = currentInputEle.id;
    const parentTab = currentInputEle.closest('.tab-content, .sub-tab-content');
    const parentTabId = parentTab ? parentTab.id : '';

    let headerString = '';
    if (parentTabId === 'search') {
        headerString = document.getElementById('搜索请求头参数')?.value || '';
    } else {
        headerString = document.getElementById('请求头参数')?.value || '';
    }
    const headers = parseHeaders(headerString);

    const fieldDefinition = findFieldDefinition(XYQHikerFieldsData, fieldId);
    const parentRuleId = fieldDefinition ? fieldDefinition.dependsOn : null;

    if (parentRuleId) {
        const parentSelector = document.getElementById(parentRuleId)?.value || '';
        if (!parentSelector) {
            resultDiv.innerHTML = `<b><span style="color:red;">测试失败:</span></b> 依赖的父规则 "${parentRuleId}" 为空。`;
            return;
        }
        resultDiv.innerHTML = `正在执行父规则 [<b>${parentRuleId}</b>]...`;
        const parentResult = await runTest(url, parentSelector, null, headers);
        if (!parentResult.success || !parentResult.extractedElements || parentResult.extractedElements.length === 0) {
            resultDiv.innerHTML = `<b><span style="color:red;">父规则测试失败:</span></b> 未能从父规则 [<b>${parentRuleId}</b>] 中找到任何元素。请先确保父规则正确。`;
            return;
        }
        const contextHtml = parentResult.extractedElements[0].outerHTML;
        const firstElementText = parentResult.extractedElements[0].textContent.trim().substring(0, 100);
        resultDiv.innerHTML = `父规则执行成功, 已找到 ${parentResult.extractedElements.length} 个元素。<br><b>上下文(第一个元素预览):</b> <pre style="background-color:#eee;padding:5px;">${firstElementText}...</pre>`;
        const childResult = await runTest(null, selector, contextHtml, headers);
        updateTestModalContent(childResult, selector, `在 [${parentRuleId}] 的第一个结果内`, false);
    } else {
        const result = await runTest(url, selector, null, headers);
        updateTestModalContent(result, selector, url, false);
        if (fieldId === '分类片单链接' && result.success && result.finalResult.length > 0) {
            const prefix = document.getElementById('分类片单链接加前缀').value;
            const suffix = document.getElementById('分类片单链接加后缀').value;
            tempDetailPageUrl = prefix + result.finalResult[0] + suffix;
            showToast('已自动获取并暂存详情页链接！', 'success');
        }
        if (fieldId === '搜索片单链接' && result.success && result.finalResult.length > 0) {
            const prefix = document.getElementById('搜索片单链接加前缀').value;
            const suffix = document.getElementById('搜索片单链接加后缀').value;
            tempDetailPageUrl = prefix + result.finalResult[0] + suffix;
            showToast('已从搜索结果自动获取并暂存详情页链接！', 'success');
        }
    }
}

/**
 * @description 切换测试结果的显示模式（纯文本/HTML）。
 */
function toggleResultMode() {
    isHtmlMode = !isHtmlMode;
    const btn = document.getElementById('toggleResultModeBtn');
    const resultDiv = document.getElementById('testResultContent');
    if (!btn || !resultDiv) return;

    const existingContent = Array.from(resultDiv.children).slice(0, 1);
    resultDiv.innerHTML = '';
    existingContent.forEach(child => resultDiv.appendChild(child));
    
    if (testResultsCache.length > 0) {
        const resultItem = testResultsCache[0];
        const displayItems = resultItem.isFinalResultDirect ? resultItem.finalResult : resultItem.extractedElements;
        if (displayItems && displayItems.length > 0) {
            const count = document.createElement('p');
            count.innerHTML = `<br><b>找到 ${displayItems.length} 个结果:</b>`;
            resultDiv.appendChild(count);
            displayItems.forEach(item => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'white-space: pre-wrap; word-break: break-all;';
                if(resultItem.isFinalResultDirect) {
                    pre.innerText = item;
                } else if (isHtmlMode) {
                    pre.innerText = item.outerHTML || '无法显示HTML内容';
                } else {
                    pre.innerText = item.textContent?.trim() || '';
                }
                resultDiv.appendChild(pre);
            });
        } else {
            const noResult = document.createElement('p');
            noResult.innerHTML = `<br><b><span style="color:red;">未找到匹配的元素。</span></b>`;
            resultDiv.appendChild(noResult);
        }
    }
    btn.innerText = isHtmlMode ? '切换到纯文本模式' : '切换到HTML模式';
}

/**
 * @description 将测试弹窗中的选择器应用到主表单对应的输入框。
 */
function applySelectorToField() {
    if (currentInputEle) {
        const newSelector = document.getElementById('testSelectorInput').value;
        currentInputEle.value = newSelector;
        saveFormData('#ruleForm', 'tvbox_form_data');
        showToast('新选择器已应用并保存！', 'success');
    }
}

/**
 * @description 展开或收起变量/提示的手风琴面板。
 * @param {string} key - 关联的输入框ID。
 * @param {object} var_btn_data - 包含变量和提示信息的对象。
 */
function toggleAccordion(key, var_btn_data) {
    let accordionDiv = document.getElementById('accordion-' + key);
    if (!accordionDiv) {
        accordionDiv = document.createElement('div');
        accordionDiv.id = 'accordion-' + key;
        accordionDiv.className = 'variable-accordion';
        document.getElementById(key)?.closest('.form-group').after(accordionDiv);
    }

    if (accordionDiv.style.display === 'flex') {
        accordionDiv.style.display = 'none';
        return;
    }

    currentInputEle = document.getElementById(key);
    accordionDiv.style.display = 'flex';
    accordionDiv.innerHTML = '';
    const variables = var_btn_data.vars || [];
    const examples = var_btn_data.tips || [];
    const varListDiv = document.createElement('div');
    varListDiv.className = 'variable-list';
    variables.forEach(v => {
        const varItem = document.createElement('div');
        varItem.className = 'variable-item';
        varItem.innerText = v;
        varItem.onclick = () => insertVariable(v);
        varListDiv.appendChild(varItem);
    });
    accordionDiv.appendChild(varListDiv);

    if (examples.length > 0) {
        const exampleBlock = document.createElement('div');
        exampleBlock.className = 'example-block';
        let exampleHtml = '<h4>使用范例:</h4>';
        examples.forEach(e => {
            exampleHtml += `<div class="example-code">${e}</div>`;
        });
        exampleBlock.innerHTML = exampleHtml;
        accordionDiv.appendChild(exampleBlock);
    }
}

/**
 * @description 在当前光标位置插入变量字符串。
 * @param {string} variable - 要插入的变量文本。
 */
function insertVariable(variable) {
    if (!currentInputEle) return;
    const input = currentInputEle;
    const startPos = input.selectionStart;
    const endPos = input.selectionEnd;
    const before = input.value.substring(0, startPos);
    const after = input.value.substring(endPos, input.value.length);
    input.value = before + variable + after;
    input.focus();
    input.selectionStart = input.selectionEnd = startPos + variable.length;
    saveFormData('#ruleForm', 'tvbox_form_data');
}





/**
 * @description 执行CSS选择器测试的核心函数。
 * @param {string|null} url - 要抓取的URL，如果提供了htmlContent则可为null。
 * @param {string} selector - 要执行的CSS选择器。
 * @param {string|null} htmlContent - 可选的HTML内容，如果提供则不抓取URL。
 * @param {object} [customHeaders={}] - 自定义请求头。
 * @returns {Promise<object>} 返回包含测试结果的Promise对象。
 */
async function runTest(url, selector, htmlContent = null, customHeaders = {}) {
    let doc;
    let elements = [];

    try {
        if (htmlContent) {
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlContent, 'text/html');
            elements = [doc];
        } else if(url) {
            let tempUrl = url;
            
            try {
                const savedData = localStorage.getItem('global_variables');
                if (savedData) {
                    const variables = JSON.parse(savedData);
                    for (const key in variables) {
                        if (variables[key] !== undefined && variables[key] !== '') {
                            tempUrl = tempUrl.replace(new RegExp(`\\{${key}\\}`, 'g'), variables[key]);
                        }
                    }
                }
            } catch (e) {
                console.warn('实时变量替换失败:', e);
            }
            
            const isPost = tempUrl.includes(';post');
            if (isPost) tempUrl = tempUrl.replace(';post', '');
            
            const proxyUrl = `/index.php/Proxy/load?target_url=${encodeURIComponent(tempUrl)}`;
            const fetchOptions = { method: isPost ? 'POST' : 'GET', headers: {} };

            if (Object.keys(customHeaders).length > 0) {
                fetchOptions.headers['X-Custom-Headers'] = JSON.stringify(customHeaders);
            }
            if(isPost) {
                let postData = document.getElementById('POST请求数据')?.value || '';
                
                try {
                    const savedData = localStorage.getItem('global_variables');
                    if (savedData) {
                        const variables = JSON.parse(savedData);
                        for (const key in variables) {
                            if (variables[key] !== undefined && variables[key] !== '') {
                                postData = postData.replace(new RegExp(`\\{${key}\\}`, 'g'), variables[key]);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('POST数据变量替换失败:', e);
                }
                
                fetchOptions.body = postData;
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }
            const response = await fetch(proxyUrl, fetchOptions);
            if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
            const htmlText = await response.text();
            const sourceInput = document.getElementById('sourceHtmlInput');
            if (sourceInput) {
                sourceInput.value = htmlText;
            }
            const parser = new DOMParser();
            doc = parser.parseFromString(htmlText, 'text/html');
            elements = [doc];
        } else {
             throw new Error('URL和HTML内容都为空。');
        }
    } catch (error) {
        return { success: false, error: error.message, finalResult: [], extractedElements: [] };
    }
    
    const selectorParts = selector.split('&&');
    let finalResult = [];
    let isFinalResultDirect = false;

    for (let i = 0; i < selectorParts.length; i++) {
        let part = selectorParts[i].trim();
        if (!part) continue;

        const attributeKeywords = ['Text', 'Html', 'href', 'data-original', 'src', 'data-src', 'title'];
        if (attributeKeywords.some(keyword => part.startsWith(keyword))) {
            const extractionParts = part.split('!');
            const extractor = extractionParts[0];

            finalResult = elements.flatMap(el => {
                let value = '';
                if (extractor === 'Text') value = el.textContent || '';
                else if (extractor === 'Html') value = el.innerHTML || '';
                else if (el.getAttribute) value = el.getAttribute(extractor) || '';
                
                if (extractionParts.length > 1) {
                    for (let j = 1; j < extractionParts.length; j++) {
                        value = value.replace(new RegExp(extractionParts[j], 'g'), '');
                    }
                }
                const trimmedValue = value.trim();
                return trimmedValue ? [trimmedValue] : [];
            });
            isFinalResultDirect = true;
            break;
        }

        let nextElements = [];
        try {
            for (const currentElement of elements) {
                if (currentElement.nodeType !== 1 && currentElement.nodeType !== 9) continue;
                nextElements.push(...Array.from(currentElement.querySelectorAll(part)));
            }
        } catch (e) {
            nextElements = []; 
        }
        elements = nextElements;
        if (elements.length === 0) break;
    }
    
    return { success: true, finalResult: isFinalResultDirect ? finalResult : [], doc: doc, extractedElements: elements, isFinalResultDirect: isFinalResultDirect };
}

/**
 * @description 开始一键自动测试流程。
 */
async function startAutomatedTest() {
    showToast('开始一键自动测试...', 'info');
    tempDetailPageUrl = '';
    
    /** @description 首先创建并打开模态窗口 */
    new Modal({
        id: 'testModal',
        title: '一键测试进行中...',
        content: renderTemplate('test-modal-template'),
        footer: '<button id="manualTestBtn" class="btn primary-btn" style="display:none;">运行测试</button>',
        width: '700px',
        height: '80%'
    });

    /** @description 使用延时确保模态窗口渲染完毕后再开始测试 */
    setTimeout(async () => {
        await testHomepage();
        await testCategory();
        await testDetail();
        await testPlay();
        
        showToast('一键自动测试流程完成！', 'success');
        const modalTitle = document.querySelector('#testModal .wb-title');
        if (modalTitle) modalTitle.textContent = '一键测试完成';
    }, 500);
}

/**
 * @description 自动测试首页规则。
 */
async function testHomepage() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="home"]') }, 'home');
    const homepageUrl = document.getElementById('首页推荐链接')?.value;
    const homepageRule = document.getElementById('首页片单列表数组规则')?.value;
    
    if (!homepageUrl || !homepageRule) {
        updateTestModalContent({ success: false, error: '首页规则或URL为空，跳过此测试。' }, '首页片单列表数组规则', 'N/A', true);
        return;
    }
    
    currentInputEle = document.getElementById('首页片单列表数组规则');
    document.getElementById('testSelectorInput').value = homepageRule;
    document.getElementById('testUrl').value = homepageUrl;
    
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await runTest(homepageUrl, homepageRule, null, headers);
    updateTestModalContent(result, homepageRule, homepageUrl, true);
    
    if (result.success && result.extractedElements.length > 0) {
        showToast('【首页规则】测试通过！', 'success');
    } else {
        showToast('【首页规则】测试失败。', 'error');
    }
}

/**
 * @description 自动测试分类规则。
 */
async function testCategory() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="category"]') }, 'category');
    const subTabButton = document.querySelector('#category .sub-tab-btn');
    if (subTabButton) openSubTab({ currentTarget: subTabButton }, 'category-rules-basic');
    
    let categoryUrlTemplate = document.getElementById('分类链接')?.value || '';
    const categoryRule = document.getElementById('分类列表数组规则')?.value;
    const detailUrlRule = document.getElementById('分类片单链接')?.value;
    
    if (!categoryUrlTemplate || !categoryRule || !detailUrlRule) {
         updateTestModalContent({ success: false, error: '分类规则或URL为空，跳过此测试。' }, '分类列表数组规则', 'N/A', true);
        return;
    }
    
    categoryUrlTemplate = categoryUrlTemplate.replace(/\[firstPage=.*?\]/, '');
    currentInputEle = document.getElementById('分类列表数组规则');
    document.getElementById('testSelectorInput').value = categoryRule;
    document.getElementById('testUrl').value = categoryUrlTemplate;
    
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    await new Promise(resolve => setTimeout(resolve, 500));
    const result = await runTest(categoryUrlTemplate, categoryRule, null, headers);
    updateTestModalContent(result, categoryRule, categoryUrlTemplate, true);
    
    if (result.success && result.extractedElements.length > 0) {
        showToast('【分类列表数组规则】测试通过！', 'success');
        const firstMovieEl = result.extractedElements[0].outerHTML;
        const detailUrlResult = await runTest(null, detailUrlRule, firstMovieEl, headers);
        
        if (detailUrlResult.success && detailUrlResult.finalResult.length > 0) {
            const prefix = document.getElementById('分类片单链接加前缀')?.value || '';
            const suffix = document.getElementById('分类片单链接加后缀')?.value || '';
            tempDetailPageUrl = prefix + detailUrlResult.finalResult[0] + suffix;
            showToast('已从分类结果中获取到详情页链接。', 'success');
        } else {
            showToast('无法从分类结果中提取详情页链接。', 'error');
        }
    } else {
        showToast('【分类列表数组规则】测试失败。', 'error');
    }
}

/**
 * @description 自动测试详情页规则。
 */
async function testDetail() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="detail"]') }, 'detail');
    if (!tempDetailPageUrl) {
         updateTestModalContent({ success: false, error: '详情页URL为空，跳过【详情规则】测试。'}, 'N/A', 'N/A', true);
        return;
    }
    
    const detailRules = ['演员详情', '简介详情', '类型详情'];
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    
    for (const ruleId of detailRules) {
        const selector = document.getElementById(ruleId)?.value;
        if (!selector) continue;
        
        currentInputEle = document.getElementById(ruleId);
        document.getElementById('testSelectorInput').value = selector;
        document.getElementById('testUrl').value = tempDetailPageUrl;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = await runTest(tempDetailPageUrl, selector, null, headers);
        updateTestModalContent(result, selector, tempDetailPageUrl, true);
        
        if (result.success && (result.finalResult.length > 0 || result.extractedElements.length > 0)) {
            showToast(`【${ruleId}】测试通过！`, 'success');
        } else {
            showToast(`【${ruleId}】测试失败。`, 'error');
        }
    }
}

/**
 * @description 自动测试播放列表规则。
 */
async function testPlay() {
    openTab({ currentTarget: document.querySelector('.tabs .tab-btn[onclick*="play"]') }, 'play');
    if (!tempDetailPageUrl) {
         updateTestModalContent({ success: false, error: '详情页URL为空，跳过【播放规则】测试。'}, 'N/A', 'N/A', true);
        return;
    }
    
    const playRules = ['线路列表数组规则', '选集列表数组规则'];
    const headers = parseHeaders(document.getElementById('请求头参数')?.value);
    
    for (const ruleId of playRules) {
        const selector = document.getElementById(ruleId)?.value;
        if (!selector) continue;
        
        currentInputEle = document.getElementById(ruleId);
        document.getElementById('testSelectorInput').value = selector;
        document.getElementById('testUrl').value = tempDetailPageUrl;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        const result = await runTest(tempDetailPageUrl, selector, null, headers);
        updateTestModalContent(result, selector, tempDetailPageUrl, true);
        
        if (result.success && result.extractedElements.length > 0) {
            showToast(`【${ruleId}】测试通过！`, 'success');
        } else {
            showToast(`【${ruleId}】测试失败。`, 'error');
        }
    }
}