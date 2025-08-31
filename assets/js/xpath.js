/**
 * --------------------------------------------------------------------
 * @description     Xpath规则编辑器核心脚本
 * @author      https://t.me/CCfork
 * @copyright   Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */
document.addEventListener('DOMContentLoaded', () => {

    if (typeof xpathFieldsData === 'undefined') {
        alert('核心数据 xpathFieldsData 未能从 el.js 加载，无法渲染编辑器。');
        return;
    }
    
    let currentInputEle;
    let testResultsCache = [];
    let isHtmlMode = false;

    
    /**
     * @description 在一个嵌套的数据结构中，根据ID查找字段的定义。
     */
    function findFieldDefinition(fieldsData, fieldId) {
        for (const key in fieldsData) {
            const data = fieldsData[key];
            let fields = [];
            if (Array.isArray(data)) {
                fields = data;
            } else if (typeof data === 'object' && data !== null) {
                if (data.rules) fields.push(...data.rules);
                if (data.filters) fields.push(...data.filters);
            }
            const found = fields.find(field => field.id === fieldId);
            if (found) return found;
        }
        return null;
    }

    /**
     * @description 根据 xpathFieldsData 的结构动态渲染整个表单
     */
    function renderForm() {
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
        for (const tabId in xpathFieldsData) {
            const container = document.getElementById(tabId);
            if (!container) continue;
            if (tabId === 'filter') continue;
            const fields = prepareFieldsWithActions(xpathFieldsData[tabId]);
            renderFormFields(tabId, fields);
        }
    }
    
    /**
     * @description 统一的测试功能入口
     */
    function openTestModal(key) {
        currentInputEle = document.getElementById(key);
        if (!currentInputEle) return;
        
        const fieldDef = findFieldDefinition(xpathFieldsData, key);
        
        new Modal({
            id: 'testModal',
            title: '测试：' + (fieldDef ? fieldDef.key : 'XPath'),
            content: renderTemplate('test-modal-template'),
            footer: '<button id="manualTestBtn" class="btn primary-btn">运行测试</button>',
            width: '700px', height: '80%'
        });

        setTimeout(() => {
            const baseFieldId = key.endsWith('R') ? key.slice(0, -1) : key;
            const baseXpath = document.getElementById(baseFieldId)?.value || '';
            document.getElementById('testSelectorInput').value = baseXpath;
            
            const resultDiv = document.getElementById('testResultContent');
            const resultContainer = document.querySelector('.test-result-container');
            
            if (key.endsWith('R')) {
                const regex = document.getElementById(key)?.value || '';
                resultDiv.innerHTML = `
                    <p style="margin:0;"><strong>提取规则:</strong> <pre style="background:#f0f0f0; padding:5px; border-radius:3px; word-break:break-all;">${regex}</pre></p>
                    <hr>
                    <div style="text-align:center;">等待运行测试...</div>
                `;
            } else {
                 resultDiv.innerHTML = ``;
            }
            resultContainer.style.display = 'block';

            document.getElementById('sourceHtmlInput').style.display = 'none';
            document.getElementById('toggleResultModeBtn').innerText = '切换到HTML模式';

            let url = '';
            const parentTabId = currentInputEle.closest('.tab-content')?.id || '';
            if (parentTabId === 'home') url = document.getElementById('homeUrl')?.value || '';
            else if (parentTabId === 'category') url = document.getElementById('cateUrl')?.value || '';
            else if (parentTabId === 'detail') url = document.getElementById('dtUrl')?.value || '';
            else if (parentTabId === 'search') url = document.getElementById('searchUrl')?.value || '';
            else if (parentTabId === 'play') url = document.getElementById('playUrl')?.value || '';
            
            document.getElementById('testUrl').value = url || '请手动输入URL';
        }, 100);
    }

    /**
     * @description 执行手动测试的核心函数，逻辑对齐Java
     */
    async function manualRunTest() {
        const resultDiv = document.getElementById('testResultContent');
        const resultContainer = document.querySelector('.test-result-container');
        resultContainer.style.display = 'block';
        resultDiv.innerHTML = '正在准备测试...';

        const resolveContext = async (fieldId, initialUrl, initialHtml) => {
            const fieldDef = findFieldDefinition(xpathFieldsData, fieldId);
            if (!fieldDef?.dependsOn) {
                return { success: true, contextHtml: initialHtml, contextUrl: initialUrl, parentRuleId: null };
            }

            const parentRuleId = fieldDef.dependsOn;
            const parentSelector = document.getElementById(parentRuleId)?.value;
            if (!parentSelector) {
                return { success: false, error: `依赖的父规则 "${parentRuleId}" 为空。` };
            }
            
            const grandParentContext = await resolveContext(parentRuleId, initialUrl, initialHtml);
            if (!grandParentContext.success) {
                return grandParentContext;
            }
            
            const parentResult = await runTest(grandParentContext.contextUrl, parentSelector, grandParentContext.contextHtml);
            if (!parentResult.success || parentResult.finalResult.length === 0) {
                return { success: false, error: `父规则 "${parentSelector}" (in context of ${grandParentContext.parentRuleId || 'top level'}) 未能找到任何元素。` };
            }

            const contextNode = parentResult.finalResult[0];
            const newContextHtml = contextNode.outerHTML || new XMLSerializer().serializeToString(contextNode);
            return { success: true, contextHtml: newContextHtml, contextUrl: null, parentRuleId: parentRuleId };
        };

        try {
            let urlTemplate = document.getElementById('testUrl').value;
            let selector = document.getElementById('testSelectorInput').value;
            const sourceHtmlInput = document.getElementById('sourceHtmlInput');
            const sourceHtml = sourceHtmlInput.value;
            const currentFieldId = currentInputEle.id;
            const isRegexTest = currentFieldId.endsWith('R') && currentFieldId.length > 1;
            const parentTabId = currentInputEle.closest('.tab-content')?.id || '';

            let finalContextUrl = null;
            let finalContextHtml = sourceHtml;
            let displayUrl = '本地源码测试';

            const isSourceHtmlVisible = sourceHtmlInput && sourceHtmlInput.style.display !== 'none';
            const hasSourceHtml = sourceHtml && sourceHtml.trim() !== '';

            if (isSourceHtmlVisible && hasSourceHtml) {
                finalContextUrl = null;
                finalContextHtml = sourceHtml;
                displayUrl = '本地源码测试';
            } else {
                let processedUrl = urlTemplate;
                
                if (parentTabId === 'category') {
                    const cateUrlValue = document.getElementById('cateUrl')?.value;
                    if (cateUrlValue) {
                        try {
                            const savedData = localStorage.getItem('global_variables');
                            if (savedData) {
                                const variables = JSON.parse(savedData);
                                const cateId = variables['cateId'] || '';
                                const catePg = variables['catePg'] || '1';
                                processedUrl = buildCategoryUrl(cateId, catePg);
                            } else {
                                processedUrl = buildCategoryUrl('', '1');
                            }
                        } catch (e) {
                            processedUrl = buildCategoryUrl('', '1');
                        }
                        finalContextUrl = processedUrl;
                        displayUrl = finalContextUrl;
                    } else {
                        finalContextUrl = document.getElementById('homeUrl')?.value;
                        if (!finalContextUrl) throw new Error('分类URL为空，且主页URL也为空，无法确定测试上下文。');
                        displayUrl = `分类URL为空, 上下文回退到主页: ${finalContextUrl}`;
                    }
                } else if (parentTabId === 'detail') {
                    if (urlTemplate.includes('{vid}')) {
                        resultDiv.innerHTML = '正在从列表页获取第一个项目以构建详情URL...';
                        finalContextUrl = await getDetailPageUrl();
                        displayUrl = finalContextUrl;
                        showToast('详情页URL已自动获取！', 'success');
                    } else {
                        finalContextUrl = urlTemplate;
                        displayUrl = finalContextUrl;
                    }
                } else {
                    try {
                        const savedData = localStorage.getItem('global_variables');
                        if (savedData) {
                            const variables = JSON.parse(savedData);
                            for (const key in variables) {
                                if (variables[key] !== undefined && variables[key] !== '') {
                                    processedUrl = processedUrl.replace(new RegExp(`\\{${key}\\}`, 'g'), variables[key]);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn('变量替换失败:', e);
                    }
                    finalContextUrl = processedUrl;
                    displayUrl = finalContextUrl;
                }
                finalContextHtml = '';
            }

            if (!finalContextUrl && !finalContextHtml) throw new Error('测试URL和源码都为空，无法测试。');
            if (!selector) throw new Error('XPath选择器不能为空。');

            resultDiv.innerHTML = '正在准备并执行测试...';
            
            const baseFieldId = isRegexTest ? currentFieldId.slice(0, -1) : currentFieldId;
            const contextResult = await resolveContext(baseFieldId, finalContextUrl, finalContextHtml);

            if (!contextResult.success) {
                throw new Error(`上下文测试失败: ${contextResult.error}`);
            }

            const finalResult = await runTest(contextResult.contextUrl, selector, contextResult.contextHtml);
            const parentRuleDisplay = contextResult.parentRuleId ? `在 [${contextResult.parentRuleId}] 的第一个结果内` : displayUrl;
            
            if (isRegexTest) {
                const regexFilter = document.getElementById(currentFieldId)?.value;
                const extractedNode = (finalResult.success && finalResult.finalResult.length > 0) ? finalResult.finalResult[0] : null;
                const extractedString = (extractedNode ? (extractedNode.nodeValue || extractedNode.textContent) : '').trim();
                const finalValue = doReplaceRegex(regexFilter, extractedString);
                
                resultDiv.innerHTML = `
                    <p style="margin:0;"><strong>上下文:</strong> ${parentRuleDisplay}</p>
                    <hr>
                    <p style="margin:0;"><strong>提取规则 (Regex):</strong> <pre style="background:#f0f0f0; padding:5px; border-radius:3px; word-break:break-all;">${regexFilter}</pre></p>
                    <p style="margin:0;"><strong>从上下文中提取到的原始值:</strong> <pre style="background:#e9ecef; padding:5px; border-radius:3px;">${extractedString}</pre></p>
                    <p style="margin:0;"><strong>正则匹配后的最终结果:</strong> <pre style="color:green; font-weight:bold; background:#e9ecef; padding:5px; border-radius:3px;">${finalValue}</pre></p>
                `;
            } else {
                updateTestModalContent(finalResult, selector, parentRuleDisplay);
            }

        } catch (error) {
            resultDiv.innerHTML = `<span style="color:red;">测试失败:</span> ${error.message}`;
        }
    }

    /**
     * @description 核心正则替换函数，对齐Java `doReplaceRegex`
     */
    function doReplaceRegex(regexString, src) {
        if (!regexString || !src) {
            return src;
        }
        try {
            const match = new RegExp(regexString).exec(src);
            if (match && match.length > 1) {
                return match[1].trim();
            }
            return src;
        } catch (e) {
            console.error("Regex Error:", e);
            return src;
        }
    }

    /**
     * @description 构建分类URL，对齐Java `categoryUrl`
     */
    function buildCategoryUrl(tid, pg) {
        let cateUrl = document.getElementById('cateUrl')?.value || '';
        const extend = window.loadVariables.extend || {};
        const variables = { ...extend, cateId: tid, catePg: pg };
        for (const key in variables) {
            const value = variables[key];
            if (value && value.length > 0) {
                cateUrl = cateUrl.replace(`{${key}}`, encodeURIComponent(value));
            }
        }
        const placeholders = cateUrl.match(/\{[^{}]+\}/g) || [];
        for (const placeholder of placeholders) {
            const paramName = placeholder.substring(1, placeholder.length-1);
            cateUrl = cateUrl.replace(placeholder, '').replace(new RegExp(`/${paramName}/`, 'g'), '/');
        }
        return cateUrl;
    }

    /**
     * @description 核心测试执行函数
     */
    async function runTest(url, selector, htmlContent = null) {
        let doc;
        let contextNodeForEval;
        let isFragment = false;

        try {
            if (htmlContent) {
                isFragment = true;
                const parser = new DOMParser();
                doc = parser.parseFromString(htmlContent, 'text/html');
                contextNodeForEval = doc.body.childNodes.length === 1 ? doc.body.firstChild : doc.body;
            } else if (url) {
                const proxyUrl = `/index.php/Proxy/load?target_url=${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
                const htmlText = await response.text();
                if (document.getElementById('sourceHtmlInput')) {
                    document.getElementById('sourceHtmlInput').value = htmlText;
                }
                const parser = new DOMParser();
                doc = parser.parseFromString(htmlText, 'text/html');
                contextNodeForEval = doc;
            } else {
                throw new Error('URL和HTML内容都为空。');
            }
        } catch (error) {
            return { success: false, error: error.message, finalResult: [] };
        }

        try {
            let evalSelector = selector;
            if (isFragment && selector.startsWith('/') && !selector.startsWith('//')) {
                evalSelector = '.' + selector;
            }
            
            const result = doc.evaluate(evalSelector, contextNodeForEval, null, XPathResult.ANY_TYPE, null);
            const elements = [];
            let currentNode;
            while ((currentNode = result.iterateNext())) {
                elements.push(currentNode);
            }
            testResultsCache = [{ selector, url: url || '本地源码测试', finalResult: elements }];
            return { success: true, finalResult: elements };
        } catch (e) {
            return { success: false, error: `XPath解析失败: ${e.message}`, finalResult: [] };
        }
    }

    
    /**
     * @description 更新测试弹窗的结果区域
     */
    function updateTestModalContent(result, selector, url) {
        const resultDiv = document.getElementById('testResultContent');
        resultDiv.innerHTML = '';
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `<b>测试URL:</b> ${url}<br><b>XPath选择器:</b> <pre style="display: inline; padding: 2px 4px; background-color: #f0f0f0; border-radius: 3px; word-break:break-all;">${selector}</pre><br>`;
        resultDiv.appendChild(infoDiv);

        if (result.success && result.finalResult?.length > 0) {
            const count = document.createElement('p');
            count.innerHTML = `<br><b>找到 ${result.finalResult.length} 个结果:</b>`;
            resultDiv.appendChild(count);
            
            result.finalResult.forEach(item => {
                const pre = document.createElement('pre');
                pre.style.cssText = 'white-space: pre-wrap; word-break: break-all; border: 1px solid #eee; padding: 5px; margin-top: 5px;';
                let displayValue = '';
                if (isHtmlMode) {
                    pre.textContent = item.outerHTML || new XMLSerializer().serializeToString(item);
                } else {
                    if (item.nodeType === Node.ATTRIBUTE_NODE) {
                        displayValue = item.value;
                    } else if (item.nodeType === Node.TEXT_NODE) {
                        displayValue = item.nodeValue;
                    } else {
                        displayValue = item.textContent;
                    }
                    
                    const fieldId = currentInputEle.id;
                    const regexFieldId = fieldId.endsWith('R') ? fieldId : fieldId + 'R';
                    const regexFilterInput = document.getElementById(regexFieldId);
                    const regexFilter = regexFilterInput ? regexFilterInput.value : '';
                    
                    const trimmedValue = (displayValue || '').trim();
                    const finalResult = doReplaceRegex(regexFilter, trimmedValue);
                    pre.textContent = finalResult;
                }
                resultDiv.appendChild(pre);
            });
        } else {
            const noResult = document.createElement('p');
            noResult.innerHTML = `<br><b><span style="color:red;">未找到匹配的元素。</span></b>`;
            if (result.error) noResult.innerHTML += `<br>错误信息: ${result.error}`;
            resultDiv.appendChild(noResult);
        }
    }

    /**
     * @description 自动获取详情页URL的辅助函数
     */
    async function getDetailPageUrl() {
        let listSourceUrl;
        let listNodeRule;
        let listIdRule;
        let listIdRegexRule;

        const cateUrlValue = document.getElementById('cateUrl')?.value;
        if (cateUrlValue) {
            // 分类URL存在，使用分类规则
            listSourceUrl = buildCategoryUrl(window.loadVariables['cateId'] || '', window.loadVariables['catePg'] || '1');
            listNodeRule = document.getElementById('cateVodNode')?.value;
            listIdRule = document.getElementById('cateVodId')?.value;
            listIdRegexRule = document.getElementById('cateVodIdR')?.value;
        } else {
            // 分类URL不存在，使用首页规则
            listSourceUrl = document.getElementById('homeUrl')?.value;
            listNodeRule = document.getElementById('homeVodNode')?.value;
            listIdRule = document.getElementById('homeVodId')?.value;
            listIdRegexRule = document.getElementById('homeVodIdR')?.value;
        }
        
        if (!listSourceUrl) {
            throw new Error('无法确定列表来源URL（分类和主页URL都为空）。');
        }
        if (!listNodeRule || !listIdRule) {
            throw new Error(`无法获取详情页ID，因为列表节点或ID规则为空。`);
        }
        
        const listResult = await runTest(listSourceUrl, listNodeRule, null);
        if (!listResult.success || listResult.finalResult.length === 0) {
             throw new Error(`无法从 ${listSourceUrl} 获取到影片列表。请检查对应的列表规则！`);
        }
        
        const firstItemHtml = listResult.finalResult[0].outerHTML;
        const idResult = await runTest(null, listIdRule, firstItemHtml);

        if (!idResult.success || idResult.finalResult.length === 0) {
             throw new Error(`无法从影片列表中提取ID。请检查对应的ID规则！`);
        }
        
        let extractedIdRaw = '';
        const idNode = idResult.finalResult[0];
        if (idNode) {
             extractedIdRaw = idNode.nodeType === Node.ATTRIBUTE_NODE ? idNode.value : (idNode.nodeValue || idNode.textContent);
        }

        const extractedId = doReplaceRegex(listIdRegexRule, extractedIdRaw.trim());
        
        const dtUrlTemplate = document.getElementById('dtUrl').value;
        if (!dtUrlTemplate) {
             throw new Error(`详情页URL模板为空。`);
        }
        
        return dtUrlTemplate.replace('{vid}', extractedId);
    }
    
    /**
     * @description 切换测试结果显示模式 (HTML/纯文本)
     */
    function toggleResultMode() {
        if (!testResultsCache || testResultsCache.length === 0) return;
        isHtmlMode = !isHtmlMode;
        const btn = document.getElementById('toggleResultModeBtn');
        const cachedResult = testResultsCache[0];
        const results = cachedResult?.finalResult || [];
        updateTestModalContent({ success: true, finalResult: results }, cachedResult.selector, cachedResult.url);
        btn.innerText = isHtmlMode ? '切换到纯文本模式' : '切换到HTML模式';
    }

    /**
     * @description 将测试弹窗中的选择器应用到主表单
     */
    function applySelectorToField() {
        if (currentInputEle) {
            currentInputEle.value = document.getElementById('testSelectorInput').value;
            showToast('新选择器已应用！', 'success');
        }
    }

    /**
     * @description 展开/收起变量提示面板
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
    }

    /**
     * @description 向输入框中插入变量
     */
    function insertVariable(variable) {
        if (!currentInputEle) return;
        const input = currentInputEle;
        const startPos = input.selectionStart;
        const endPos = input.selectionEnd;
        input.value = input.value.substring(0, startPos) + variable + input.value.substring(endPos);
        input.focus();
        input.selectionStart = input.selectionEnd = startPos + variable.length;
    }

    let filterData = {};
    let activeCategoryName = null;
    
    /**
     * @description 初始化筛选编辑器
     */
    function initFilterEditor(initialData) {
        const tpl = document.getElementById('filter-editor-template');
        if (!tpl) return;
        const filterEditorTemplate = Handlebars.compile(tpl.innerHTML);
        document.getElementById('filter').innerHTML = filterEditorTemplate();
        filterData = {};
        if (initialData.cateManual) {
            for (const name in initialData.cateManual) {
                const id = initialData.cateManual[name];
                filterData[name] = { id: id, groups: initialData.filter && initialData.filter[id] ? initialData.filter[id] : [] };
            }
        }
        renderCategoryList();
        renderFilterJson(null);
        bindFilterEditorEvents();
    }

    /**
     * @description 渲染筛选编辑器的主分类列表
     */
    function renderCategoryList() {
        const listEl = document.querySelector('.filter-categories-list');
        if (!listEl) return;
        const listItems = Object.keys(filterData).map(name => {
            const activeClass = name === activeCategoryName ? 'active' : '';
            return `<li class="${activeClass}" data-category-name="${name}">${name}</li>`;
        }).join('');
        listEl.innerHTML = listItems || '<div class="placeholder-text">暂无主分类</div>';
    }

    /**
     * @description 渲染筛选编辑器中选中分类的JSON内容
     */
    function renderFilterJson(categoryName) {
        const textarea = document.getElementById('filter-json-editor');
        if (!textarea) return;
        textarea.style.opacity = '0';
        setTimeout(() => {
            if (!categoryName || !filterData[categoryName]) {
                textarea.value = '';
            } else {
                textarea.value = JSON.stringify(filterData[categoryName].groups, null, 2);
            }
            textarea.style.opacity = '1';
        }, 150);
    }

    /**
     * @description 为筛选编辑器绑定事件
     */
    function bindFilterEditorEvents() {
        const container = document.getElementById('filter');
        if(!container) return;
        container.addEventListener('input', (e) => {
            if (activeCategoryName && e.target.id === 'filter-json-editor') {
                try {
                    filterData[activeCategoryName].groups = JSON.parse(e.target.value);
                } catch(err) {}
            }
        });
        container.addEventListener('click', (e) => {
            const categoryItem = e.target.closest('li[data-category-name]');
            if (categoryItem) {
                activeCategoryName = categoryItem.dataset.categoryName;
                renderCategoryList();
                renderFilterJson(activeCategoryName);
            }
            if (e.target.classList.contains('add-category-btn')) {
                const newName = prompt('请输入新的主分类名称:', '新分类');
                if (newName && !filterData[newName]) {
                    const newId = (Object.keys(filterData).length + 1).toString();
                    filterData[newName] = { id: newId, groups: [] };
                    activeCategoryName = newName;
                    renderCategoryList();
                    renderFilterJson(newName);
                } else if(newName) {
                    alert('该分类名称已存在！');
                }
            }
            if (e.target.classList.contains('delete-active-category-btn')) {
                if (!activeCategoryName) {
                    alert('请先从列表中选择一个要删除的主分类。');
                    return;
                }
                if (confirm(`确定要删除当前选中的主分类 "${activeCategoryName}" 吗？`)) {
                    delete filterData[activeCategoryName];
                    activeCategoryName = null;
                    renderCategoryList();
                    renderFilterJson(null);
                }
            }
            if (e.target.classList.contains('add-filter-group-btn')) {
                if (!activeCategoryName) {
                    alert('请先选择一个主分类，再添加筛选组。');
                    return;
                }
                filterData[activeCategoryName].groups.push({ key: 'new_key', name: '新筛选', value: [{n:"全部",v:""}] });
                renderFilterJson(activeCategoryName);
            }
        });
    }

    /**
     * @description 填充整个表单
     */
    function fillForm(data) {
        for (const key in data) {
            const input = document.getElementById(key);
            if (input) {
                if (typeof data[key] === 'object' && data[key] !== null) {
                    input.value = JSON.stringify(data[key], null, 2);
                } else {
                    input.value = data[key];
                }
            }
        }
    }

    /**
     * @description 收集整个表单的数据
     */
    function collectFormData() {
        const data = {};
        const form = document.getElementById('xpath-rule-form');
        for (const tabId in xpathFieldsData) {
            if (tabId === 'filter') continue;
            xpathFieldsData[tabId].forEach(field => {
                const element = form.elements[field.id];
                if (element && element.value && field.id !== 'cateManual') {
                     if (element.value.trim().startsWith('{') || element.value.trim().startsWith('[')) {
                        try { data[field.id] = JSON.parse(element.value); } catch (e) { data[field.id] = element.value; }
                    } else {
                        data[field.id] = element.value;
                    }
                }
            });
        }
        
        if (typeof filterData !== 'undefined') {
            const newCateManual = {};
            const newFilter = {};
            for (const name in filterData) {
                const category = filterData[name];
                newCateManual[name] = category.id;
                if(category.groups && category.groups.length > 0) {
                     newFilter[category.id] = category.groups;
                }
            }
            data.cateManual = newCateManual;
            data.filter = newFilter;
        }
        return data;
    }
    
    document.body.addEventListener('click', (event) => {
        if(event.target.id==='manualTestBtn')manualRunTest();
        if(event.target.id==='applySelectorBtn')applySelectorToField();
        if(event.target.id==='toggleSourceBtn'){const t=document.getElementById("sourceHtmlInput");t&&(t.style.display="none"===t.style.display?"block":"none")}
        if(event.target.id==='toggleResultModeBtn')toggleResultMode();
        if(event.target.id==='saveVariablesBtn')saveVariables()
    });
    
    document.getElementById('saveBtn').addEventListener('click', () => {
        if (!filePathFromServer) {
            showToast('文件路径未知，无法保存。', 'error');
            return;
        }
        const jsonData = collectFormData();
        const fileContent = JSON.stringify(jsonData, null, 2);
        const formData = new FormData();
        formData.append('filePath', filePathFromServer);
        formData.append('fileContent', fileContent);
        showToast('正在保存...', 'info');
        fetch('/index.php/Edit/save', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(result => {
            if (result.success) { showToast(result.message, 'success'); } 
            else { throw new Error(result.message); }
        })
        .catch(err => { showToast(`保存失败: ${err.message}`, 'error'); });
    });

    document.getElementById('sourceEditBtn').addEventListener('click', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const file = urlParams.get('file');
        window.open('/index.php/Edit?file=' + encodeURIComponent(file) + '&api=editor', '_blank');
    });
    
    renderForm();
    loadVariables();
    if (fileContentFromServer) {
        try {
            const data = parseCleanJson(fileContentFromServer);
            fillForm(data);
            initFilterEditor(data);
        } catch(e) {
            showToast(`解析规则JSON失败: ${e.message}`, 'error');
            console.error("JSON Parse Error:", e);
        }
    } else {
        initFilterEditor({});
    }
});