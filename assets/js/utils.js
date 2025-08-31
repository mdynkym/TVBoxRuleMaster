/**
 * --------------------------------------------------------------------
 * @description     通用组件库，包含UI组件、数据处理、本地存储、表单渲染等可复用函数。
 * @author          https://t.me/CCfork
 * @copyright       Copyright (c) 2025, https://t.me/CCfork
 * --------------------------------------------------------------------
 */

/**
 * @description 移动设备 User-Agent
 */
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

/**
 * @description 个人电脑 User-Agent
 */
const PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36';


/**
 * @description 切换标签页的显示状态。
 * @param {Event} evt - 触发事件的对象。
 * @param {string} tabId - 需要显示的目标标签内容区的ID。
 */
function openTab(evt, tabId) {
    const clickedButton = evt.currentTarget;
    const buttonContainer = clickedButton.parentElement;
    if (!buttonContainer) return;

    const buttons = buttonContainer.querySelectorAll(`.${clickedButton.classList[0]}`);
    buttons.forEach(btn => btn.classList.remove('active'));

    const contentParent = buttonContainer.parentElement;
    const contentClass = clickedButton.classList[0].replace('-btn', '-content');
    if (contentParent) {
        contentParent.querySelectorAll(`.${contentClass}`).forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
    }

    clickedButton.classList.add('active');
    
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.style.display = 'block';
        tabElement.classList.add('active');

        const nestedActiveButton = tabElement.querySelector('.tab-btn.active');
        if (nestedActiveButton) {
            const onclickAttr = nestedActiveButton.getAttribute('onclick');
            if (onclickAttr) {
                const nestedContentId = onclickAttr.match(/'([^']*)'/)[1];
                const nestedContentElement = document.getElementById(nestedContentId);
                if (nestedContentElement) {
                    nestedContentElement.style.display = 'block';
                    nestedContentElement.classList.add('active');
                }
            }
        }
        document.querySelector('.tab-btn.active')?.click();
    }
}

/**
 * @description 显示一个短暂的通知消息 (Toast)。
 * @param {string} message - 要显示的消息内容。
 * @param {string} [type=''] - 消息类型 ('success', 'error', 'info')，用于样式控制。
 */
function showToast(message, type = '') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

/**
 * @description 用于存放活动模态窗口实例的全局对象。
 */
const activeModals = {};

/**
 * @description 通用模态弹窗类 (Modal Class)，基于 WinBox.js 进行封装。
 */
class Modal {
    constructor(options) {
        this.options = Object.assign({
            title: 'Modal',
            content: '',
            footer: '',
            id: null,
            width: '650px',
            height: '60%',
            resizable: true,
            showMax: true,
            showMin: true,
            showFull: true,
            onClose: null,
        }, options);

        this.winboxInstance = null;
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.resizeHandler = this._handleResize.bind(this);
        
        this.open();
    }

    _handleResize() {
        if (this.winboxInstance && this.isMobile) {
            this.winboxInstance.resize('100%', '100%').move('center', 'center');
        }
    }

    open() {
        if (this.winboxInstance) {
            this.winboxInstance.focus();
            return this;
        }
        lockScroll(['.main-header', '#scrollToTopBtn']);
        let controlClasses = [];
        if (!this.options.showMax) controlClasses.push('no-max');
        if (!this.options.showMin) controlClasses.push('no-min');
        if (!this.options.showFull) controlClasses.push('no-full');

        const winboxParams = {
            id: this.options.id,
            title: this.options.title,
            class: ["modal-winbox", ...controlClasses],
            x: 'center',
            y: 'center',
            width: this.isMobile ? '100%' : this.options.width,
            height: this.isMobile ? '100%' : this.options.height,
            resize: this.isMobile ? false : this.options.resizable,
            onclose: () => {
                unlockScroll(['.main-header', '#scrollToTopBtn']);

                if (this.isMobile) {
                    window.removeEventListener('resize', this.resizeHandler);
                }
                if (typeof this.options.onClose === 'function') {
                    this.options.onClose();
                }
                if (this.options.id) {
                    delete activeModals[this.options.id];
                }
                this.winboxInstance = null;
                return false;
            }
        };
        
        if (typeof this.options.content === 'string' && (this.options.content.startsWith('http') || this.options.content.startsWith('/') || this.options.content.startsWith('index.php'))) {
            winboxParams.url = this.options.content;
        } else {
            const mainContentHtml = `<div class="modal-main-content">${this.options.content || ''}</div>`;
            const footerHtml = `<div class="modal-footer">${this.options.footer || ''}</div>`;
            winboxParams.html = mainContentHtml + footerHtml;
        }

        this.winboxInstance = new WinBox(winboxParams);
        if (this.options.id) {
            activeModals[this.options.id] = this;
        }

        if (this.isMobile) {
            window.addEventListener('resize', this.resizeHandler);
        }

        return this;
    }
    
    close() {
        if (this.winboxInstance) {
            this.winboxInstance.close();
        }
    }
    
    getBodyElement() {
        return this.winboxInstance?.body.querySelector('.modal-main-content');
    }

    getFooterElement() {
        return this.winboxInstance?.body.querySelector('.modal-footer');
    }

    maximize() {
        this.winboxInstance?.maximize();
        return this;
    }
}

/**
 * @description 通过ID关闭一个WinBox窗口。
 * @param {string} id - WinBox实例的ID。
 */
function closeModalById(id) {
    const modalInstance = activeModals[id];
    if (modalInstance) {
        modalInstance.close();
    }
}

/**
 * 显示一个可配置的、返回Promise的异步对话框。
 */
function showDialog(options) {
    const config = Object.assign({
        title: '',
        message: '',
        type: 'alert',
        placeholder: '',
        okText: '确认',
        cancelText: '取消',
    }, options);

    return new Promise((resolve, reject) => {
        lockScroll(['.main-header', '#scrollToTopBtn']);
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';

        let inputHtml = '';
        if (config.type === 'prompt') {
            inputHtml = `<input type="text" class="dialog-input" placeholder="${config.placeholder}">`;
        }

        let buttonsHtml = `<button class="btn primary-btn ok-btn">${config.okText}</button>`;
        if (config.type === 'confirm' || config.type === 'prompt') {
            buttonsHtml = `<button class="btn secondary-btn cancel-btn">${config.cancelText}</button>` + buttonsHtml;
        }

        const dialogHtml = `
            <div class="dialog-container" role="dialog" aria-modal="true" tabindex="-1">
                <div class="dialog-header">${config.title}</div>
                <div class="dialog-body">
                    <p>${config.message}</p>
                    ${inputHtml}
                </div>
                <div class="dialog-footer">${buttonsHtml}</div>
            </div>
        `;
        overlay.innerHTML = dialogHtml;
        document.body.appendChild(overlay);

        const dialogContainer = overlay.querySelector('.dialog-container');
        const inputElement = overlay.querySelector('.dialog-input');
        const okBtn = overlay.querySelector('.ok-btn');
        const cancelBtn = overlay.querySelector('.cancel-btn');

        const closeDialog = (reason) => {
            unlockScroll(['.main-header', '#scrollToTopBtn']);
            overlay.classList.remove('visible');
            const handleTransitionEnd = () => {
                overlay.removeEventListener('transitionend', handleTransitionEnd);
                overlay.remove(); 
                if (reason === 'resolve') {
                    const result = config.type === 'prompt' ? inputElement.value : true;
                    resolve(result);
                } else {
                    reject(new Error('Dialog cancelled by user.'));
                }
            };
            overlay.addEventListener('transitionend', handleTransitionEnd);
        };

        if (okBtn) {
            okBtn.addEventListener('click', () => closeDialog('resolve'));
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => closeDialog('reject'));
        }
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeDialog('reject');
            }
        });

        setTimeout(() => {
            overlay.classList.add('visible');
            dialogContainer.focus();
            if(inputElement) inputElement.focus();
        }, 10);
    });
}

/**
 * @description 注册通用的 Ctrl+S 保存快捷键。
 * @param {function} onSave - 当用户按下 Ctrl+S 时要执行的回调函数。
 */
function setupSaveShortcut(onSave) {
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault(); /** 阻止浏览器默认的“保存网页”行为 */
            if (typeof onSave === 'function') {
                onSave();
            }
        }
    });
}

/**
 * @description 计算字符串的MD5哈希值。
 * @param {string} string - 需要进行哈希计算的原始字符串。
 * @param {object} [options={}] - 一个可选的配置对象。
 * @param {boolean} [options.pretty=false] - 如果为 true，则将输出格式化为大写，并每8个字符用连字符(-)分隔。
 * @returns {string} 计算出的32位十六进制MD5哈希值。
 */
function md5(string, options = {}) {
    function rotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }

    function addUnsigned(lX, lY) {
        let lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }

    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }

    function FF(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
        a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
        return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(string) {
        let lWordCount;
        const lMessageLength = string.length;
        const lNumberOfWords_temp1 = lMessageLength + 8;
        const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        let lWordArray = Array(lNumberOfWords - 1);
        let lBytePosition = 0;
        let lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    }

    function wordToHex(lValue) {
        let WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    }

    let x = Array();
    let k, AA, BB, CC, DD, a, b, c, d;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    x = convertToWordArray(string);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, AA);
        b = addUnsigned(b, BB);
        c = addUnsigned(c, CC);
        d = addUnsigned(d, DD);
    }

    let result = (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
    
    if (options.pretty) {
        result = result.toUpperCase().replace(/(.{8})(?!$)/g, '$1-');
    }

    return result;
}

/**
 * @description 平滑地将页面滚动到顶部。
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
document.addEventListener('DOMContentLoaded', () => {
    const scrollTopBtn = document.getElementById('scrollToTopBtn');
    if (!scrollTopBtn) return;

    scrollTopBtn.addEventListener('click', scrollToTop);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            scrollTopBtn.classList.add('visible');
        } else {
            scrollTopBtn.classList.remove('visible');
        }
    }, { passive: true });
});

/**
 * @description 编译并渲染 Handlebars 模板。
 * @param {string} templateId - 模板的 script 标签ID。
 * @param {object} [data={}] - 渲染模板所需的数据对象。
 * @returns {string} 渲染后的HTML字符串，如果模板未找到则返回空字符串。
 */
function renderTemplate(templateId, data = {}) {
    const source = document.getElementById(templateId)?.innerHTML;
    if (!source) {
        console.error(`Template with ID '${templateId}' not found.`);
        return '';
    }
    const template = Handlebars.compile(source);
    return template(data);
}

/**
 * @description 从表单中收集所有数据并组装成一个JSON对象。
 * @param {string} formId - 目标表单的ID。
 * @returns {object} 包含所有表单数据的对象。
 */
function collectFormDataIntoJson(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const inputs = form.querySelectorAll('input, textarea');
    const data = {};

    inputs.forEach(input => {
        if (input.id && input.value) {
            /** 对于ID为'筛选数据'的特殊处理，尝试解析为JSON对象 */
            if (input.id === '筛选数据') {
                try {
                    data[input.id] = JSON.parse(input.value);
                } catch (e) {
                    data[input.id] = input.value; /** 解析失败则存为字符串 */
                }
            } else {
                data[input.id] = input.value;
            }
        }
    });
    
    return data;
}

/**
 * @description 将当前表单数据保存到localStorage。
 * @param {string} formSelector - 目标表单的CSS选择器。
 * @param {string} storageKey - 用于保存在localStorage中的键名。
 */
function saveFormData(formSelector, storageKey) {
    const formInputs = document.querySelectorAll(`${formSelector} input, ${formSelector} textarea`);
    const formData = {};
    formInputs.forEach(input => {
        if (input.id) {
            formData[input.id] = input.value;
        }
    });
    localStorage.setItem(storageKey, JSON.stringify(formData));
}

/**
 * @description 从localStorage加载并填充表单数据。
 * @param {string} formSelector - 目标表单的CSS选择器。
 * @param {string} storageKey - 用于从localStorage中读取的键名。
 */
function loadFormData(formSelector, storageKey) {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
        try {
            const formData = JSON.parse(savedData);
            for (const key in formData) {
                const input = document.querySelector(`${formSelector} #${key}`);
                if (input) {
                    input.value = formData[key];
                }
            }
        } catch (e) {
            console.error('加载本地表单数据失败:', e);
        }
    }
}

/**
 * @description 使用给定的数据对象填充表单字段。
 * @param {object} data - 包含键值对的数据对象，键名应与表单元素的ID匹配。
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
 * @description 解析特定格式的请求头参数字符串。
 * @param {string} headerString - 格式化的请求头字符串 (例如: 'User-Agent$电脑#Referer$http://...')
 * @returns {object} 解析后的请求头对象。
 */
function parseHeaders(headerString) {
    const headers = {};
    if (!headerString) return headers;
    const trimmed = headerString.trim();
    if (trimmed === '手机' || trimmed === 'MOBILE_UA') {
        headers['User-Agent'] = MOBILE_UA;
        return headers;
    }
    if (trimmed === '电脑' || trimmed === 'PC_UA') {
        headers['User-Agent'] = PC_UA;
        return headers;
    }
    const pairs = trimmed.split('#');
    pairs.forEach(pair => {
        if (pair.includes('$')) {
            const parts = pair.split('$');
            const key = parts.shift().trim();
            const value = parts.join('$').trim();
            if (key && value) {
                headers[key] = value;
            }
        }
    });
    return headers;
}

/**
 * @description 解析资源路径，移除md5等后缀。
 * @param {string} pathStr - 原始路径字符串 (例如: './libs/drpy.js;md5;f6899548d867389a19c36394595a8898')
 * @returns {string|null} 解析后的路径 (例如: './libs/drpy.js')
 */
function parseAssetPath(pathStr) {
    if (!pathStr || typeof pathStr !== 'string') return null;
    return pathStr.split(';')[0];
}

/**
 * @description 获取URL的基础路径 (即最后一个'/'之前的所有部分)。
 * @param {string} url - 完整的URL地址。
 * @returns {string} URL的基础路径。
 */
function getBaseUrl(url) {
    const lastSlash = url.lastIndexOf('/');
    return url.substring(0, lastSlash + 1);
}

/**
 * @description 从localStorage安全地获取并解析一个JSON项。
 * @param {string} key - localStorage中的键名。
 * @param {*} [defaultValue=[]] - 如果项不存在或解析失败时返回的默认值。
 * @returns {*} 解析后的对象或默认值。
 */
function getLocalStorageItem(key, defaultValue = []) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error(`从localStorage读取 '${key}' 失败:`, e);
        return defaultValue;
    }
}

/**
 * @description 更新localStorage中的历史记录数组 (确保唯一性并限制长度)。
 * @param {string} key - localStorage中的键名。
 * @param {string} newItem - 要添加的新项目。
 * @param {number} [maxSize=20] - 历史记录的最大长度。
 */
function updateLocalStorageHistory(key, newItem, maxSize = 20) {
    let history = getLocalStorageItem(key, []);
    history = history.filter(item => item !== newItem);
    history.unshift(newItem);
    if (history.length > maxSize) {
        history.pop();
    }
    localStorage.setItem(key, JSON.stringify(history));
}

/**
 * @description 在一个嵌套的数据结构中，根据ID查找字段的定义。
 * @param {object} fieldsData - 包含字段定义的数据对象。
 * @param {string} fieldId - 要查找的字段ID。
 * @returns {object|null} 找到的字段定义对象，或null。
 */
function findFieldDefinition(fieldsData, fieldId) {
    for (const key in fieldsData) {
        const data = fieldsData[key];
        let fields = [];

        if (Array.isArray(data)) {
            fields = data;
        } else if (typeof data === 'object' && data !== null) {
            /** 兼容 'category' 这种特殊结构 */
            if (data.rules) fields.push(...data.rules);
            if (data.filters) fields.push(...data.filters);
        }

        const found = fields.find(field => field.id === fieldId);
        if (found) {
            return found;
        }
    }
    return null;
}

/**
 * @description 将一组字段配置动态渲染到指定的容器元素中，并附加交互。
 * @param {string|HTMLElement} containerOrId - 目标容器的ID或DOM元素。
 * @param {Array<object>} fields - 要渲染的字段定义数组。
 */
function renderFormFields(containerOrId, fields) {
    const container = typeof containerOrId === 'string' 
        ? document.getElementById(containerOrId) 
        : containerOrId;

    if (!container) {
        console.error('无法找到用于渲染表单字段的容器:', containerOrId);
        return;
    }

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    fields.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        if (field.isAdvanced) {
            formGroup.classList.add('advanced-field');
        }

        const label = document.createElement('label');
        label.setAttribute('for', field.id);
        label.innerText = field.key;
        label.title = field.desc || field.key;
        fragment.appendChild(label);

        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-with-buttons';

        const input = field.type === 'textarea' 
            ? document.createElement('textarea') 
            : document.createElement('input');
        input.type = field.type || 'text';
        input.id = field.id;
        input.name = field.id;
        if (field.placeholder) {
            input.placeholder = field.placeholder;
        }
        inputWrapper.appendChild(input);

        /** @description 动态创建按钮并绑定回调 */
        if (Array.isArray(field.buttons)) {
            field.buttons.forEach(btnConfig => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = btnConfig.className || 'btn secondary-btn btn-sm';
                button.innerText = btnConfig.label;
                button.addEventListener('click', () => {
                    if (typeof btnConfig.onClick === 'function') {
                        /** 将字段ID和完整定义作为参数传给回调 */
                        btnConfig.onClick(field.id, field);
                    }
                });
                inputWrapper.appendChild(button);
            });
        }
        
        formGroup.appendChild(inputWrapper);
        fragment.appendChild(formGroup);
    });

    container.appendChild(fragment);
}

/**
 * @description GitHub加速代理的处理
 * @param {string} url 原始URL
 * @returns {string} 处理过的URL
 */
function applyGitHubProxy(url) {
    if (typeof url !== 'string') {
        return url;
    }

    const proxy = localStorage.getItem('githubProxyUrl') || '';
    const githubIdentifier = 'https://raw.githubusercontent.com/';

    const githubIndex = url.indexOf(githubIdentifier);

    if (githubIndex === -1) {
        return url;
    }

    const githubPart = url.substring(githubIndex);

    if (proxy) {
        const cleanProxy = proxy.replace(/\/$/, ''); // 清理末尾的 /
        return cleanProxy + '/' + githubPart;
    } else {
        return githubPart;
    }
}

/**
 * @description 安全地清理并解析包含注释的JSON字符串 (JSONC)。
 * 此函数能够正确处理行注释(//, #)、块注释(/*...* /)
 * 并能忽略字符串常量中出现的注释标记。
 * @param {string} content - 原始的、可能包含注释的JSON字符串。
 * @returns {object} 解析后的JavaScript对象。
 */
function parseCleanJson(content) {
    if (typeof content !== 'string') {
        throw new Error("Invalid input: content must be a string.");
    }

    const len = content.length;
    let cleanedJson = '';
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;

    for (let i = 0; i < len; i++) {
        const char = content[i];
        const nextChar = i + 1 < len ? content[i + 1] : '';

        // 如果在单行注释中，遇到换行符则结束注释
        if (inSingleLineComment) {
            if (char === '\n' || char === '\r') {
                inSingleLineComment = false;
                cleanedJson += char; // 保留换行符以维持行号
            }
            continue;
        }

        // 如果在多行注释中，遇到 */ 则结束注释
        if (inMultiLineComment) {
            if (char === '*' && nextChar === '/') {
                inMultiLineComment = false;
                i++; // 跳过 '/'
            }
            continue;
        }

        // 切换字符串状态
        if (char === '"') {
            // 检查是否是转义的引号
            if (!inString || (inString && content[i - 1] !== '\\')) {
                 inString = !inString;
            }
        }

        // 如果不在字符串中，则检查注释的开始
        if (!inString) {
            // 检查单行注释 // 或 #
            if ((char === '/' && nextChar === '/') || char === '#') {
                inSingleLineComment = true;
                i += (char === '/' ? 1 : 0); // 如果是 //, 跳过第二个 /
                continue;
            }
            // 检查多行注释 /*
            if (char === '/' && nextChar === '*') {
                inMultiLineComment = true;
                i++; // 跳过 '*'
                continue;
            }
        }

        cleanedJson += char;
    }

    // 移除尾随逗号
    const finalJson = cleanedJson.replace(/,\s*([}\]])/g, '$1');

    try {
        return JSON.parse(finalJson);
    } catch (error) {
        // 提供更详细的错误信息
        console.error("Failed to parse cleaned JSON content:", finalJson);
        throw new Error(`JSON parsing error: ${error.message}`);
    }
}

/**
 * 锁定body滚动，并处理固定定位元素的偏移问题
 * @param {string[]} [fixedElementSelectors=[]] - 需要一并处理的固定定位元素的选择器数组
 */
function lockScroll(fixedElementSelectors = []) {
    const body = document.body;
    
    if (body.scrollHeight > window.innerHeight) {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        body.style.paddingRight = `${scrollbarWidth}px`;
        if (fixedElementSelectors.length > 0) {
            document.querySelectorAll(fixedElementSelectors.join(', ')).forEach(el => {
                el.style.paddingRight = `${scrollbarWidth}px`;
            });
        }
    }

    body.classList.add('body-lock-scroll');
}

/**
 * 解锁body滚动，并恢复固定定位元素
 * @param {string[]} [fixedElementSelectors=[]] - 需要一并处理的固定定位元素的选择器数组
 */
function unlockScroll(fixedElementSelectors = []) {
    const body = document.body;
    
    body.style.paddingRight = '';
    if (fixedElementSelectors.length > 0) {
        document.querySelectorAll(fixedElementSelectors.join(', ')).forEach(el => {
            el.style.paddingRight = '';
        });
    }
    
    body.classList.remove('body-lock-scroll');
}

/**
 * @description 初始化所有下拉按钮组件, 并智能处理其展开方向 (向上或向下).
 */
function initDropdowns() {
    document.addEventListener('click', function(e) {
        const isDropdownButton = e.target.closest('[data-toggle="dropdown"]');
        const dropdown = isDropdownButton ? isDropdownButton.closest('.dropdown') : null;

        document.querySelectorAll('.dropdown-menu.active').forEach(menu => {
            const currentDropdown = menu.closest('.dropdown');
            if (currentDropdown !== dropdown) {
                menu.classList.remove('active');
                currentDropdown.classList.remove('dropup');
            }
        });

        if (dropdown) {
            const menu = dropdown.querySelector('.dropdown-menu');
            if (menu) {
                const wasActive = menu.classList.contains('active');
                menu.classList.toggle('active'); // 切换当前点击菜单的 active 状态

                if (!wasActive) {
                    handleDropdownPositioning(dropdown, menu);
                } else {
                    dropdown.classList.remove('dropup');
                }
            }
        }
    });

    /**
     * @description 自动处理下拉菜单的展开方向 (此为内部函数)
     * @param {HTMLElement} dropdown - .dropdown 容器元素
     * @param {HTMLElement} menu - .dropdown-menu 菜单元素
     */
    function handleDropdownPositioning(dropdown, menu) {
        requestAnimationFrame(() => {
            const boundary = dropdown.closest('.modal-main-content') || document.documentElement;
            const menuRect = menu.getBoundingClientRect();
            const boundaryRect = boundary.getBoundingClientRect();
            const isOverflowing = menuRect.bottom > (boundaryRect.bottom - 5);

            if (isOverflowing) {
                const toggle = dropdown.querySelector('[data-toggle="dropdown"]');
                const toggleRect = toggle.getBoundingClientRect();
                                const spaceAbove = toggleRect.top - boundaryRect.top;
                
                if (spaceAbove >= menu.offsetHeight) {
                    dropdown.classList.add('dropup');
                } else {
                    dropdown.classList.remove('dropup');
                }
            } else {
                dropdown.classList.remove('dropup');
            }
        });
    }
}

/**
 * @description 安全地解码包含UTF-8字符的Base64字符串
 * @param {string} base64 - Base64编码的字符串
 * @returns {string} 解码后的UTF-8字符串
 */
function decodeBase64Utf8(base64) {
    try {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        console.error("Base64 decoding failed:", e);
        return "{}"; 
    }
}

/**
 * @description 获取格式化为 YYYY-MM-DD HH:mm:ss 的本地时间字符串
 * @returns {string} 格式化后的本地时间
 */
function getFormattedLocalTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * @description 从本地存储加载变量
 */
function loadVariables() {
    const savedData = localStorage.getItem('global_variables');
    if (savedData) {
        try {
            window.loadVariables = JSON.parse(savedData);
        } catch(e) {
            window.loadVariables = {};
        }
    }
}