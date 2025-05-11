// DOM元素
const mediaContainer = document.getElementById('media-container');
const cameraPreview = document.getElementById('camera-preview');
const screenPreview = document.getElementById('screen-preview');
const audioVisualizer = document.getElementById('audio-visualizer');
const audioPreview = document.getElementById('audio-preview');
const themeToggle = document.getElementById('theme-toggle');

// 检测是否为移动设备
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 预览容器
const cameraContainer = document.getElementById('camera-preview-container');
const screenContainer = document.getElementById('screen-preview-container');
const audioContainer = document.getElementById('audio-preview-container');

// 状态和错误消息
const cameraStatus = document.getElementById('camera-status');
const cameraError = document.getElementById('camera-error');
const screenStatus = document.getElementById('screen-status');
const screenError = document.getElementById('screen-error');
const audioStatus = document.getElementById('audio-status');
const audioError = document.getElementById('audio-error');

// 输出区域
const outputArea = document.getElementById('output-area');

// 按钮
const startCameraBtn = document.getElementById('start-camera');
const takePhotoBtn = document.getElementById('take-photo');
const startScreenBtn = document.getElementById('start-screen');
const screenShotBtn = document.getElementById('screen-shot');
const startAudioBtn = document.getElementById('start-audio');
const recordVideoBtn = document.getElementById('record-video');
const stopRecordingBtn = document.getElementById('stop-recording');
const stopAllBtn = document.getElementById('stop-all');

// 设置控件
const layoutPreset = document.getElementById('layout-preset');
const applyLayoutBtn = document.getElementById('apply-layout');
const saveLayoutBtn = document.getElementById('save-layout');
const loadLayoutBtn = document.getElementById('load-layout');
const resetLayoutBtn = document.getElementById('reset-layout');
const showBordersCheckbox = document.getElementById('show-borders');
const showTitlesCheckbox = document.getElementById('show-titles');
const transparentBgCheckbox = document.getElementById('transparent-bg');
const cameraFilter = document.getElementById('camera-filter');
const screenFilter = document.getElementById('screen-filter');
const showWatermarkCheckbox = document.getElementById('show-watermark');
const watermarkText = document.getElementById('watermark-text');
const watermarkPosition = document.getElementById('watermark-position');
const watermarkOpacity = document.getElementById('watermark-opacity');
const watermarkSize = document.getElementById('watermark-size');
const watermarkColor = document.getElementById('watermark-color');

// 背景控制
const backgroundType = document.getElementById('background-type');
const backgroundColor = document.getElementById('background-color');
const backgroundImage = document.getElementById('background-image');
const gradientColorEnd = document.getElementById('gradient-color-end');
const gradientDirection = document.getElementById('gradient-direction');
const bgPresets = document.querySelectorAll('.bg-preset');

// 纯净模式按钮
const pureModeBtn = document.getElementById('pure-mode');
const pureModeDropdown = document.getElementById('pure-mode-dropdown');
const pureModeOptions = document.querySelectorAll('.pure-mode-option');

// 媒体流变量
let cameraStream = null;
let screenStream = null;
let audioStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let audioContext = null;
let audioAnalyser = null;

// 辅助函数：HSL转RGB的hue处理
function hueToRgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
}

// 在Canvas上应用滤镜效果的辅助函数
function applyCanvasFilter(ctx, rect, filterClass) {
    // 根据滤镜类型应用不同的处理
    const imageData = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
    const data = imageData.data;
    
    switch(filterClass) {
        case 'filter-grayscale':
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                data[i] = avg;     // 红
                data[i + 1] = avg; // 绿
                data[i + 2] = avg; // 蓝
            }
            break;
        case 'filter-sepia':
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            }
            break;
        // ... 更多滤镜效果 ...
    }
    
    ctx.putImageData(imageData, rect.x, rect.y);
}

// 实现拖拽功能
function makeDraggable(element) {
    let offsetX, offsetY, isDragging = false;
    
    element.addEventListener('mousedown', function(e) {
        // 如果点击的是调整大小的手柄，不执行拖拽
        if (e.target.className === 'resize-handle') return;
        
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        
        // 不再修改z-index，保持当前层级
        
        // 添加活动状态
        element.classList.add('active');
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
        
        e.preventDefault();
    });
    
    function moveHandler(e) {
        if (!isDragging) return;
        
        // 计算新位置
        const containerRect = mediaContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        let newLeft = e.clientX - containerRect.left - offsetX;
        let newTop = e.clientY - containerRect.top - offsetY;
        
        // 确保不移出容器
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - elementRect.width));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - elementRect.height));
        
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
    }
    
    function upHandler() {
        isDragging = false;
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        
        // 移除活动状态
        element.classList.remove('active');
    }
}

// 实现调整大小功能
function makeResizable(element) {
    const resizeHandle = element.querySelector('.resize-handle');
    
    if (!resizeHandle) return;
    
    let startX, startY, startWidth, startHeight;
    
    resizeHandle.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
        
        // 不再修改z-index，保持当前层级
        
        // 添加活动状态
        element.classList.add('active');
        
        document.addEventListener('mousemove', resizeMove);
        document.addEventListener('mouseup', resizeStop);
        
        e.preventDefault();
        e.stopPropagation();  // 防止触发父元素的拖拽
    });
    
    function resizeMove(e) {
        // 计算新尺寸
        const containerRect = mediaContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        let newWidth = startWidth + e.clientX - startX;
        let newHeight = startHeight + e.clientY - startY;
        
        // 确保尺寸不会超出容器边界
        const maxHeight = containerRect.height - (elementRect.top - containerRect.top);
        const maxWidth = containerRect.width - (elementRect.left - containerRect.left);
        
        // 确保尺寸在合理范围内
        newWidth = Math.max(200, Math.min(newWidth, maxWidth));
        newHeight = Math.max(150, Math.min(newHeight, maxHeight));
        
        element.style.width = newWidth + 'px';
        element.style.height = newHeight + 'px';
    }
    
    function resizeStop() {
        document.removeEventListener('mousemove', resizeMove);
        document.removeEventListener('mouseup', resizeStop);
        
        // 移除活动状态
        element.classList.remove('active');
    }
}

// 初始化纯净模式功能
function setupPureMode() {
    // 纯净模式按钮点击事件
    pureModeBtn.addEventListener('click', () => {
        // 切换下拉菜单显示状态
        const isVisible = pureModeDropdown.style.display === 'block';
        pureModeDropdown.style.display = isVisible ? 'none' : 'block';
        
        // 添加点击外部关闭下拉菜单
        if (!isVisible) {
            setTimeout(() => {
                document.addEventListener('click', closePureModeDropdown);
            }, 0);
        }
    });
    
    // 点击其他地方关闭下拉菜单
    function closePureModeDropdown(e) {
        if (!pureModeDropdown.contains(e.target) && e.target !== pureModeBtn) {
            pureModeDropdown.style.display = 'none';
            document.removeEventListener('click', closePureModeDropdown);
        }
    }
    
    // 为每个纯净模式选项添加点击事件
    pureModeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const layout = option.getAttribute('data-layout');
            applyLayout(layout);
            pureModeDropdown.style.display = 'none';
        });
    });
}

// 实现层级控制功能
function setupLayerControls() {
    // 所有预览区域
    const previewAreas = document.querySelectorAll('.preview-area');
    
    // 获取当前最大z-index
    function getMaxZIndex() {
        let maxZ = 0;
        previewAreas.forEach(area => {
            const z = parseInt(window.getComputedStyle(area).zIndex, 10);
            if (!isNaN(z) && z > maxZ) {
                maxZ = z;
            }
        });
        return maxZ;
    }
    
    // 更新所有区域的层级显示
    function updateAllZIndices() {
        // 获取所有区域及其z-index
        const areaZIndices = [];
        previewAreas.forEach(area => {
            areaZIndices.push({
                element: area,
                zIndex: parseInt(window.getComputedStyle(area).zIndex, 10) || 1
            });
        });
        
        // 按z-index排序
        areaZIndices.sort((a, b) => a.zIndex - b.zIndex);
        
        // 重新分配z-index，确保连续性
        for (let i = 0; i < areaZIndices.length; i++) {
            areaZIndices[i].element.style.zIndex = (i + 1).toString();
        }
    }
    
    // 初始化每个区域的层级
    updateAllZIndices();
    
    // 设置层级事件监听
    previewAreas.forEach(area => {
        const upBtn = area.querySelector('.layer-up');
        const downBtn = area.querySelector('.layer-down');
        
        if (upBtn) {
            upBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发拖拽
                
                // 获取所有区域按z-index排序
                const allAreas = Array.from(previewAreas);
                const areaZIndices = allAreas.map(a => ({
                    element: a,
                    zIndex: parseInt(window.getComputedStyle(a).zIndex, 10) || 1
                }));
                
                // 按z-index排序（从小到大）
                areaZIndices.sort((a, b) => a.zIndex - b.zIndex);
                
                // 寻找当前元素的索引
                const currentIndex = areaZIndices.findIndex(a => a.element === area);
                
                // 如果不是最上层，则与上一层交换
                if (currentIndex < areaZIndices.length - 1) {
                    const currentElement = areaZIndices[currentIndex].element;
                    const higherElement = areaZIndices[currentIndex + 1].element;
                    
                    // 交换层级
                    const temp = currentElement.style.zIndex;
                    currentElement.style.zIndex = higherElement.style.zIndex;
                    higherElement.style.zIndex = temp;
                    
                    // 添加提示效果
                    area.classList.add('active');
                    setTimeout(() => {
                        area.classList.remove('active');
                    }, 500);
                }
            });
        }
        
        if (downBtn) {
            downBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 防止触发拖拽
                
                // 获取所有区域按z-index排序
                const allAreas = Array.from(previewAreas);
                const areaZIndices = allAreas.map(a => ({
                    element: a,
                    zIndex: parseInt(window.getComputedStyle(a).zIndex, 10) || 1
                }));
                
                // 按z-index排序（从小到大）
                areaZIndices.sort((a, b) => a.zIndex - b.zIndex);
                
                // 寻找当前元素的索引
                const currentIndex = areaZIndices.findIndex(a => a.element === area);
                
                // 如果不是最底层，则与下一层交换
                if (currentIndex > 0) {
                    const currentElement = areaZIndices[currentIndex].element;
                    const lowerElement = areaZIndices[currentIndex - 1].element;
                    
                    // 交换层级
                    const temp = currentElement.style.zIndex;
                    currentElement.style.zIndex = lowerElement.style.zIndex;
                    lowerElement.style.zIndex = temp;
                    
                    // 添加提示效果
                    area.classList.add('active');
                    setTimeout(() => {
                        area.classList.remove('active');
                    }, 500);
                }
            });
        }
    });
}

// 启动摄像头
async function startCamera() {
    try {
        // 检查是否已有摄像头权限
        if (cameraStream) {
            showStatus(cameraStatus, '摄像头已开启');
            return;
        }
        
        showStatus(cameraStatus, '请求摄像头权限...');
        
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        cameraPreview.srcObject = cameraStream;
        cameraPreview.onloadedmetadata = function() {
            cameraPreview.play();
            showStatus(cameraStatus, '摄像头已开启');
            
            // 启用拍照按钮
            takePhotoBtn.disabled = false;
            
            // 如果屏幕共享也开启，启用录制按钮
            if (screenStream) {
                recordVideoBtn.disabled = false;
            }
        };
        
        cameraContainer.classList.remove('hidden-element');
        updateVisibleElements();
        
    } catch (error) {
        console.error('获取摄像头失败:', error);
        showError(cameraError, '无法访问摄像头: ' + error.message);
    }
}

// 启动屏幕共享
async function startScreenShare() {
    try {
        // 检查是否已有屏幕共享权限
        if (screenStream) {
            showStatus(screenStatus, '屏幕共享已开启');
            return;
        }
        
        showStatus(screenStatus, '请求屏幕共享权限...');
        
        screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                cursor: 'always'
            },
            audio: false
        });
        
        screenPreview.srcObject = screenStream;
        screenPreview.onloadedmetadata = function() {
            screenPreview.play();
            showStatus(screenStatus, '屏幕共享已开启');
            
            // 启用屏幕截图按钮
            screenShotBtn.disabled = false;
            
            // 如果摄像头也开启，启用录制按钮
            if (cameraStream) {
                recordVideoBtn.disabled = false;
            }
        };
        
        // 监听屏幕共享结束事件
        screenStream.getVideoTracks()[0].onended = function() {
            stopScreenShare();
        };
        
        screenContainer.classList.remove('hidden-element');
        updateVisibleElements();
        
    } catch (error) {
        console.error('获取屏幕共享失败:', error);
        showError(screenError, '无法共享屏幕: ' + error.message);
    }
}

// 启动音频录制
async function startAudio() {
    try {
        // 检查是否已有音频权限
        if (audioStream) {
            showStatus(audioStatus, '麦克风已开启');
            return;
        }
        
        showStatus(audioStatus, '请求麦克风权限...');
        
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        });
        
        // 创建音频可视化
        setupAudioVisualizer(audioStream);
        
        showStatus(audioStatus, '麦克风已开启');
        
        audioContainer.classList.remove('hidden-element');
        updateVisibleElements();
        
    } catch (error) {
        console.error('获取麦克风失败:', error);
        showError(audioError, '无法访问麦克风: ' + error.message);
    }
}

// 更新水印预览
function updateWatermarkPreview() {
    // 检查水印预览元素是否已存在，不存在则创建
    let watermarkPreview = document.getElementById('watermark-preview');
    if (!watermarkPreview) {
        watermarkPreview = document.createElement('div');
        watermarkPreview.id = 'watermark-preview';
        mediaContainer.appendChild(watermarkPreview);
        // 使水印可拖动
        makeDraggableWatermark(watermarkPreview);
    }
    
    // 应用水印设置
    if (showWatermarkCheckbox.checked) {
        watermarkPreview.style.display = 'block';
        watermarkPreview.textContent = watermarkText.value || '多功能媒体工具';
        watermarkPreview.style.opacity = watermarkOpacity.value / 100;
        watermarkPreview.style.fontSize = watermarkSize.value + 'px';
        watermarkPreview.style.color = watermarkColor.value;
        
        // 如果已有保存的位置，则应用
        const savedPosition = localStorage.getItem('watermarkPosition');
        if (savedPosition) {
            try {
                const position = JSON.parse(savedPosition);
                watermarkPreview.style.left = position.left + 'px';
                watermarkPreview.style.top = position.top + 'px';
            } catch (e) {
                console.error('无法解析水印位置', e);
                // 默认右下角位置
                watermarkPreview.style.right = '10px';
                watermarkPreview.style.bottom = '10px';
            }
        } else {
            // 默认右下角位置
            watermarkPreview.style.right = '10px';
            watermarkPreview.style.bottom = '10px';
        }
    } else {
        watermarkPreview.style.display = 'none';
    }
}

// 使水印可拖动
function makeDraggableWatermark(element) {
    let offsetX, offsetY, isDragging = false;
    
    element.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
        
        e.preventDefault();
    });
    
    function moveHandler(e) {
        if (!isDragging) return;
        
        const containerRect = mediaContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        let newLeft = e.clientX - containerRect.left - offsetX;
        let newTop = e.clientY - containerRect.top - offsetY;
        
        // 确保不移出容器
        newLeft = Math.max(0, Math.min(newLeft, containerRect.width - elementRect.width));
        newTop = Math.max(0, Math.min(newTop, containerRect.height - elementRect.height));
        
        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
        
        // 移除原来的定位
        element.style.right = 'auto';
        element.style.bottom = 'auto';
    }
    
    function upHandler() {
        isDragging = false;
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
        
        // 保存水印位置
        const position = {
            left: parseInt(element.style.left),
            top: parseInt(element.style.top)
        };
        localStorage.setItem('watermarkPosition', JSON.stringify(position));
    }
}

// 添加水印设置相关事件监听
function setupWatermarkControls() {
    // 更新透明度显示
    watermarkOpacity.addEventListener('input', function() {
        document.getElementById('opacity-value').textContent = this.value + '%';
        updateWatermarkPreview();
    });
    
    // 更新水印文字
    watermarkText.addEventListener('input', updateWatermarkPreview);
    
    // 更新水印大小
    watermarkSize.addEventListener('input', updateWatermarkPreview);
    
    // 更新水印颜色
    watermarkColor.addEventListener('input', updateWatermarkPreview);
    
    // 显示/隐藏水印
    showWatermarkCheckbox.addEventListener('change', updateWatermarkPreview);
}

// 更新界面选项
function updateInterfaceOptions() {
    // 检查是否处于黑暗模式
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // 应用边框显示/隐藏
    const previewAreas = document.querySelectorAll('.preview-area');
    previewAreas.forEach(area => {
        if (showBordersCheckbox.checked) {
            area.style.border = isDarkMode ? '1px solid #333' : '1px solid #ddd';
            area.style.boxShadow = isDarkMode ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.1)';
            area.style.borderRadius = '8px';
            area.style.padding = '10px';
        } else {
            area.style.border = 'none';
            area.style.boxShadow = 'none';
            area.style.borderRadius = '0';
            area.style.padding = '0';
        }
    });
    
    // 应用标题显示/隐藏
    const previewHeaders = document.querySelectorAll('.preview-header');
    previewHeaders.forEach(header => {
        header.style.display = showTitlesCheckbox.checked ? 'flex' : 'none';
    });
    
    // 调整视频大小以适应无边框模式
    const videos = document.querySelectorAll('video');
    const canvases = document.querySelectorAll('canvas');
    
    if (showBordersCheckbox.checked) {
        videos.forEach(video => {
            video.style.height = 'calc(100% - 50px)';
        });
        canvases.forEach(canvas => {
            canvas.style.height = 'calc(100% - 50px)';
        });
    } else {
        videos.forEach(video => {
            video.style.height = '100%';
        });
        canvases.forEach(canvas => {
            canvas.style.height = '100%';
        });
    }
    
    // 应用背景透明
    if (transparentBgCheckbox.checked) {
        mediaContainer.style.backgroundColor = 'transparent';
        previewAreas.forEach(area => {
            area.style.backgroundColor = 'transparent';
        });
    } else {
        updateBackground(); // 更新为设定的背景
        previewAreas.forEach(area => {
            if (showBordersCheckbox.checked) {
                area.style.backgroundColor = isDarkMode ? '#1e1e1e' : 'white';
            } else {
                area.style.backgroundColor = 'transparent';
            }
        });
    }
}

// 更新背景设置
function updateBackground() {
    if (transparentBgCheckbox.checked) {
        return; // 如果选择透明背景，不执行其他背景设置
    }
    
    // 检查是否处于黑暗模式
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    switch (backgroundType.value) {
        case 'color':
            if (isDarkMode && backgroundColor.value === '#f0f0f0') {
                // 如果是黑暗模式且是默认浅色背景，自动切换为深色背景
                mediaContainer.style.background = '#1e1e1e';
            } else {
                mediaContainer.style.background = backgroundColor.value;
            }
            break;
        case 'gradient':
            let gradientStyle;
            // 如果是黑暗模式且使用默认颜色，使用更适合黑暗模式的渐变色
            const startColor = isDarkMode && backgroundColor.value === '#f0f0f0' ? '#1e1e1e' : backgroundColor.value;
            const endColor = isDarkMode && gradientColorEnd.value === '#b3e0ff' ? '#1a237e' : gradientColorEnd.value;
            
            switch (gradientDirection.value) {
                case 'to-right':
                    gradientStyle = `linear-gradient(to right, ${startColor}, ${endColor})`;
                    break;
                case 'to-bottom':
                    gradientStyle = `linear-gradient(to bottom, ${startColor}, ${endColor})`;
                    break;
                case 'to-bottom-right':
                    gradientStyle = `linear-gradient(to bottom right, ${startColor}, ${endColor})`;
                    break;
                case 'to-bottom-left':
                    gradientStyle = `linear-gradient(to bottom left, ${startColor}, ${endColor})`;
                    break;
                case 'radial':
                    gradientStyle = `radial-gradient(circle, ${startColor}, ${endColor})`;
                    break;
                default:
                    gradientStyle = `linear-gradient(to bottom, ${startColor}, ${endColor})`;
            }
            mediaContainer.style.background = gradientStyle;
            break;
        case 'image':
            const bgImage = backgroundImage.value.trim();
            if (bgImage) {
                mediaContainer.style.backgroundImage = `url(${bgImage})`;
                mediaContainer.style.backgroundSize = 'cover';
                mediaContainer.style.backgroundPosition = 'center';
            } else {
                // 如果没有指定图片，回退到默认背景色
                if (isDarkMode) {
                    mediaContainer.style.backgroundColor = '#212121';
                } else {
                    mediaContainer.style.backgroundColor = '#f0f0f0';
                }
                mediaContainer.style.backgroundImage = 'none';
            }
            break;
    }
}

// 设置背景相关控件事件
function setupBackgroundControls() {
    // 背景类型切换
    backgroundType.addEventListener('change', function() {
        // 隐藏所有相关控件
        backgroundColor.style.display = 'none';
        gradientColorEnd.style.display = 'none';
        gradientDirection.style.display = 'none';
        document.querySelector('.image-upload-container').style.display = 'none';
        
        // 根据选择显示相应控件
        switch (this.value) {
            case 'color':
                backgroundColor.style.display = 'block';
                break;
            case 'gradient':
                backgroundColor.style.display = 'block';
                gradientColorEnd.style.display = 'block';
                gradientDirection.style.display = 'block';
                break;
            case 'image':
                document.querySelector('.image-upload-container').style.display = 'block';
                break;
        }
        
        updateBackground();
    });
    
    // 颜色变化事件
    backgroundColor.addEventListener('input', updateBackground);
    gradientColorEnd.addEventListener('input', updateBackground);
    gradientDirection.addEventListener('change', updateBackground);
    backgroundImage.addEventListener('input', updateBackground);
    
    // 透明背景切换
    transparentBgCheckbox.addEventListener('change', updateInterfaceOptions);
    
    // 边框和标题设置
    showBordersCheckbox.addEventListener('change', updateInterfaceOptions);
    showTitlesCheckbox.addEventListener('change', updateInterfaceOptions);
    
    // 背景图片上传
    const uploadBgBtn = document.getElementById('upload-bg-btn');
    const backgroundImageUpload = document.getElementById('background-image-upload');
    
    uploadBgBtn.addEventListener('click', function() {
        backgroundImageUpload.click();
    });
    
    backgroundImageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                backgroundImage.value = e.target.result;
                updateBackground();
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // 背景预设按钮
    bgPresets.forEach(preset => {
        preset.addEventListener('click', function() {
            const presetType = this.getAttribute('data-preset');
            const isDarkMode = document.body.classList.contains('dark-mode');
            
            // 移除所有active类
            bgPresets.forEach(p => p.classList.remove('active'));
            // 添加当前active类
            this.classList.add('active');
            
            // 应用预设，考虑当前主题模式
            backgroundType.value = 'color';
            switch (presetType) {
                case 'light':
                    backgroundColor.value = isDarkMode ? '#2d2d2d' : '#f0f0f0';
                    break;
                case 'dark':
                    backgroundColor.value = isDarkMode ? '#121212' : '#333333';
                    break;
                case 'blue':
                    backgroundType.value = 'gradient';
                    backgroundColor.value = isDarkMode ? '#0d47a1' : '#e3f2fd';
                    gradientColorEnd.value = isDarkMode ? '#1a237e' : '#bbdefb';
                    gradientDirection.value = 'to-bottom';
                    break;
                case 'green':
                    backgroundType.value = 'gradient';
                    backgroundColor.value = isDarkMode ? '#1b5e20' : '#e8f5e9';
                    gradientColorEnd.value = isDarkMode ? '#2e7d32' : '#c8e6c9';
                    gradientDirection.value = 'to-bottom';
                    break;
                case 'warm':
                    backgroundType.value = 'gradient';
                    backgroundColor.value = isDarkMode ? '#bf360c' : '#ffccbc';
                    gradientColorEnd.value = isDarkMode ? '#e64a19' : '#ffab91';
                    gradientDirection.value = 'to-bottom-right';
                    break;
                case 'cool':
                    backgroundType.value = 'gradient';
                    backgroundColor.value = isDarkMode ? '#0d47a1' : '#bbdefb';
                    gradientColorEnd.value = isDarkMode ? '#1565c0' : '#90caf9';
                    gradientDirection.value = 'to-bottom';
                    break;
            }
            
            // 更新控件显示
            backgroundType.dispatchEvent(new Event('change'));
        });
    });
}

// 更新可见元素
function updateVisibleElements() {
    // 获取设置的值
    const showCamera = document.getElementById('show-camera').checked;
    const showScreen = document.getElementById('show-screen').checked;
    const showAudio = document.getElementById('show-audio').checked;
    
    // 应用显示/隐藏状态
    cameraContainer.classList.toggle('hidden-element', !showCamera);
    screenContainer.classList.toggle('hidden-element', !showScreen);
    audioContainer.classList.toggle('hidden-element', !showAudio);
    
    // 更新按钮状态
    takePhotoBtn.disabled = !showCamera || !cameraStream;
    screenShotBtn.disabled = !showScreen || !screenStream;
    recordVideoBtn.disabled = (!showCamera && !showScreen) || isRecording;
}

// 应用预设布局
function applyLayout(layoutName) {
    // 获取布局下拉框和各显示选择框
    const showCameraCheckbox = document.getElementById('show-camera');
    const showScreenCheckbox = document.getElementById('show-screen');
    const showAudioCheckbox = document.getElementById('show-audio');
    
    // 更新下拉框选中值
    layoutPreset.value = layoutName;
    
    // 应用布局预设
    switch(layoutName) {
        case 'default':
            // 默认布局 - 保持原位置
            cameraContainer.style.top = '20px';
            cameraContainer.style.left = '20px';
            cameraContainer.style.width = '320px';
            cameraContainer.style.height = '240px';
            cameraContainer.style.right = 'auto';
            cameraContainer.style.bottom = 'auto';
            cameraContainer.style.transform = 'none';
            cameraContainer.style.zIndex = '3'; // 摄像头在最上层
            
            screenContainer.style.top = '20px';
            screenContainer.style.right = '20px';
            screenContainer.style.left = 'auto';
            screenContainer.style.width = '320px';
            screenContainer.style.height = '240px';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '2'; // 屏幕共享在中间层
            
            audioContainer.style.bottom = '20px';
            audioContainer.style.left = '50%';
            audioContainer.style.transform = 'translateX(-50%)';
            audioContainer.style.width = '320px';
            audioContainer.style.height = '120px';
            audioContainer.style.top = 'auto';
            audioContainer.style.right = 'auto';
            audioContainer.style.zIndex = '1'; // 音频在底层
            
            showCameraCheckbox.checked = true;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = true;
            showBordersCheckbox.checked = true;
            showTitlesCheckbox.checked = true;
            break;
            
        case 'camera-topleft':
            // 摄像头左上角
            cameraContainer.style.top = '20px';
            cameraContainer.style.left = '20px';
            cameraContainer.style.width = '320px';
            cameraContainer.style.height = '240px';
            cameraContainer.style.right = 'auto';
            cameraContainer.style.bottom = 'auto';
            cameraContainer.style.transform = 'none';
            cameraContainer.style.zIndex = '3'; // 摄像头在最上层
            
            screenContainer.style.top = '20px';
            screenContainer.style.left = '360px';
            screenContainer.style.right = 'auto';
            screenContainer.style.width = '400px';
            screenContainer.style.height = '300px';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '2'; // 屏幕共享在中间层
            
            audioContainer.style.bottom = '20px';
            audioContainer.style.left = '20px';
            audioContainer.style.transform = 'none';
            audioContainer.style.width = '320px';
            audioContainer.style.height = '120px';
            audioContainer.style.top = 'auto';
            audioContainer.style.right = 'auto';
            audioContainer.style.zIndex = '1'; // 音频在底层
            
            showCameraCheckbox.checked = true;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = true;
            showBordersCheckbox.checked = true;
            showTitlesCheckbox.checked = true;
            break;
            
        case 'screen-only':
            // 仅屏幕
            screenContainer.style.top = '20px';
            screenContainer.style.left = '20px';
            screenContainer.style.right = 'auto';
            screenContainer.style.width = 'calc(100% - 40px)';
            screenContainer.style.height = 'calc(100% - 40px)';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '1'; // 只有屏幕，层级为1
            
            showCameraCheckbox.checked = false;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = false;
            showBordersCheckbox.checked = true;
            showTitlesCheckbox.checked = true;
            break;
            
        case 'pip':
            // 画中画模式
            screenContainer.style.top = '20px';
            screenContainer.style.left = '20px';
            screenContainer.style.right = 'auto';
            screenContainer.style.width = 'calc(100% - 40px)';
            screenContainer.style.height = 'calc(100% - 150px)';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '1'; // 屏幕在底层
            
            cameraContainer.style.bottom = '20px';
            cameraContainer.style.right = '20px';
            cameraContainer.style.top = 'auto';
            cameraContainer.style.left = 'auto';
            cameraContainer.style.width = '200px';
            cameraContainer.style.height = '150px';
            cameraContainer.style.transform = 'none';
            cameraContainer.style.zIndex = '3'; // 摄像头在最上层
            
            audioContainer.style.bottom = '20px';
            audioContainer.style.left = '20px';
            audioContainer.style.transform = 'none';
            audioContainer.style.width = 'calc(100% - 240px)';
            audioContainer.style.height = '80px';
            audioContainer.style.top = 'auto';
            audioContainer.style.right = 'auto';
            audioContainer.style.zIndex = '2'; // 音频在中间层
            
            showCameraCheckbox.checked = true;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = true;
            showBordersCheckbox.checked = true;
            showTitlesCheckbox.checked = true;
            break;
            
        case 'pure-screen':
            // 纯净屏幕模式
            screenContainer.style.top = '0';
            screenContainer.style.left = '0';
            screenContainer.style.right = 'auto';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.width = '100%';
            screenContainer.style.height = '100%';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '1'; // 只有屏幕，层级为1
            
            showBordersCheckbox.checked = false;
            showTitlesCheckbox.checked = false;
            showCameraCheckbox.checked = false;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = false;
            break;
            
        case 'pure-cam':
            // 纯净摄像头模式
            cameraContainer.style.top = '0';
            cameraContainer.style.left = '0';
            cameraContainer.style.right = 'auto';
            cameraContainer.style.bottom = 'auto';
            cameraContainer.style.width = '100%';
            cameraContainer.style.height = '100%';
            cameraContainer.style.transform = 'none';
            cameraContainer.style.zIndex = '1'; // 只有摄像头，层级为1
            
            showBordersCheckbox.checked = false;
            showTitlesCheckbox.checked = false;
            showCameraCheckbox.checked = true;
            showScreenCheckbox.checked = false;
            showAudioCheckbox.checked = false;
            break;
            
        case 'pure-screen-cam':
            // 纯净屏幕+摄像头
            screenContainer.style.top = '0';
            screenContainer.style.left = '0';
            screenContainer.style.right = 'auto';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.width = '100%';
            screenContainer.style.height = '100%';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '1'; // 屏幕在底层
            
            cameraContainer.style.bottom = '20px';
            cameraContainer.style.right = '20px';
            cameraContainer.style.top = 'auto';
            cameraContainer.style.left = 'auto';
            cameraContainer.style.width = '200px';
            cameraContainer.style.height = '150px';
            cameraContainer.style.transform = 'none';
            cameraContainer.style.zIndex = '2'; // 摄像头在顶层
            
            // 添加半透明背景以使摄像头更明显
            cameraContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
            cameraContainer.style.borderRadius = '8px';
            cameraContainer.style.overflow = 'hidden';
            
            showBordersCheckbox.checked = false;
            showTitlesCheckbox.checked = false;
            showCameraCheckbox.checked = true;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = false;
            break;
            
        case 'pure-floating':
            // 悬浮窗模式
            screenContainer.style.top = '0';
            screenContainer.style.left = '0';
            screenContainer.style.right = 'auto';
            screenContainer.style.bottom = 'auto';
            screenContainer.style.width = '100%';
            screenContainer.style.height = '100%';
            screenContainer.style.transform = 'none';
            screenContainer.style.zIndex = '1'; // 屏幕在底层
            
            cameraContainer.style.top = '10px';
            cameraContainer.style.right = '10px';
            cameraContainer.style.left = 'auto';
            cameraContainer.style.bottom = 'auto';
            cameraContainer.style.width = '180px';
            cameraContainer.style.height = '135px';
            cameraContainer.style.transform = 'none';
            cameraContainer.style.zIndex = '3'; // 摄像头在最上层
            
            audioContainer.style.top = '155px';
            audioContainer.style.right = '10px';
            audioContainer.style.left = 'auto';
            audioContainer.style.bottom = 'auto';
            audioContainer.style.width = '180px';
            audioContainer.style.height = '80px';
            audioContainer.style.transform = 'none';
            audioContainer.style.zIndex = '2'; // 音频在中间层
            
            showBordersCheckbox.checked = true;
            showTitlesCheckbox.checked = true;
            showCameraCheckbox.checked = true;
            showScreenCheckbox.checked = true;
            showAudioCheckbox.checked = true;
            break;
    }
    
    // 更新界面
    updateVisibleElements();
    updateInterfaceOptions();
}

// 保存当前布局
function saveCurrentLayout() {
    // 收集所有当前布局信息
    const layout = {
        camera: {
            visible: !cameraContainer.classList.contains('hidden-element'),
            style: {
                top: cameraContainer.style.top,
                left: cameraContainer.style.left,
                right: cameraContainer.style.right,
                bottom: cameraContainer.style.bottom,
                width: cameraContainer.style.width,
                height: cameraContainer.style.height,
                transform: cameraContainer.style.transform,
                zIndex: cameraContainer.style.zIndex // 保存层级信息
            },
            filter: cameraFilter.value
        },
        screen: {
            visible: !screenContainer.classList.contains('hidden-element'),
            style: {
                top: screenContainer.style.top,
                left: screenContainer.style.left,
                right: screenContainer.style.right,
                bottom: screenContainer.style.bottom,
                width: screenContainer.style.width,
                height: screenContainer.style.height,
                transform: screenContainer.style.transform,
                zIndex: screenContainer.style.zIndex // 保存层级信息
            },
            filter: screenFilter.value
        },
        audio: {
            visible: !audioContainer.classList.contains('hidden-element'),
            style: {
                top: audioContainer.style.top,
                left: audioContainer.style.left,
                right: audioContainer.style.right,
                bottom: audioContainer.style.bottom,
                width: audioContainer.style.width,
                height: audioContainer.style.height,
                transform: audioContainer.style.transform,
                zIndex: audioContainer.style.zIndex // 保存层级信息
            }
        },
        options: {
            showBorders: showBordersCheckbox.checked,
            showTitles: showTitlesCheckbox.checked,
            transparentBg: transparentBgCheckbox.checked,
            backgroundType: backgroundType.value,
            backgroundColor: backgroundColor.value,
            backgroundImage: backgroundImage.value
        }
    };
    
    // 保存到localStorage
    localStorage.setItem('savedLayout', JSON.stringify(layout));
    
    // 显示成功消息
    showStatus(document.querySelector('.status-message'), '布局已保存');
}

// 加载保存的布局
function loadSavedLayout() {
    // 从localStorage获取布局
    const savedLayout = localStorage.getItem('savedLayout');
    
    if (savedLayout) {
        const layout = JSON.parse(savedLayout);
        
        // 应用摄像头设置
        if (layout.camera) {
            if (layout.camera.visible) {
                document.getElementById('show-camera').checked = true;
                cameraContainer.classList.remove('hidden-element');
            } else {
                document.getElementById('show-camera').checked = false;
                cameraContainer.classList.add('hidden-element');
            }
            
            Object.assign(cameraContainer.style, layout.camera.style);
            
            if (layout.camera.filter) {
                cameraFilter.value = layout.camera.filter;
                cameraPreview.className = '';
                cameraPreview.classList.add(layout.camera.filter);
            }
        }
        
        // 应用屏幕设置
        if (layout.screen) {
            if (layout.screen.visible) {
                document.getElementById('show-screen').checked = true;
                screenContainer.classList.remove('hidden-element');
            } else {
                document.getElementById('show-screen').checked = false;
                screenContainer.classList.add('hidden-element');
            }
            
            Object.assign(screenContainer.style, layout.screen.style);
            
            if (layout.screen.filter) {
                screenFilter.value = layout.screen.filter;
                screenPreview.className = '';
                screenPreview.classList.add(layout.screen.filter);
            }
        }
        
        // 应用音频设置
        if (layout.audio) {
            if (layout.audio.visible) {
                document.getElementById('show-audio').checked = true;
                audioContainer.classList.remove('hidden-element');
            } else {
                document.getElementById('show-audio').checked = false;
                audioContainer.classList.add('hidden-element');
            }
            
            Object.assign(audioContainer.style, layout.audio.style);
        }
        
        // 应用界面选项
        if (layout.options) {
            showBordersCheckbox.checked = layout.options.showBorders;
            showTitlesCheckbox.checked = layout.options.showTitles;
            transparentBgCheckbox.checked = layout.options.transparentBg;
            
            backgroundType.value = layout.options.backgroundType;
            backgroundColor.value = layout.options.backgroundColor;
            backgroundImage.value = layout.options.backgroundImage;
            
            updateInterfaceOptions();
            updateBackground();
        }
        
        // 显示成功消息
        showStatus(document.querySelector('.status-message'), '布局已加载');
    } else {
        showError(document.querySelector('.error-message'), '没有找到保存的布局');
    }
}

// 设置布局按钮事件
function setupLayoutControls() {
    // 获取布局控制按钮
    const layoutPresetSelect = document.getElementById('layout-preset');
    const applyLayoutBtn = document.getElementById('apply-layout');
    const saveLayoutBtn = document.getElementById('save-layout');
    const loadLayoutBtn = document.getElementById('load-layout');
    const resetLayoutBtn = document.getElementById('reset-layout');
    
    // 显示元素复选框
    const showCameraCheckbox = document.getElementById('show-camera');
    const showScreenCheckbox = document.getElementById('show-screen');
    const showAudioCheckbox = document.getElementById('show-audio');
    
    // 应用布局按钮
    applyLayoutBtn.addEventListener('click', () => {
        applyLayout(layoutPresetSelect.value);
    });
    
    // 保存布局按钮
    saveLayoutBtn.addEventListener('click', saveCurrentLayout);
    
    // 加载布局按钮
    loadLayoutBtn.addEventListener('click', loadSavedLayout);
    
    // 重置布局按钮
    resetLayoutBtn.addEventListener('click', () => {
        resetAllSettings();
        showStatus(document.querySelector('.status-message'), '已恢复默认布局');
    });
    
    // 显示/隐藏元素复选框
    showCameraCheckbox.addEventListener('change', updateVisibleElements);
    showScreenCheckbox.addEventListener('change', updateVisibleElements);
    showAudioCheckbox.addEventListener('change', updateVisibleElements);
}

// 显示状态消息
function showStatus(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}

// 显示错误消息
function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// 重置所有设置
function resetAllSettings() {
    // 检查是否处于黑暗模式
    const isDarkMode = document.body.classList.contains('dark-mode');
    
    // 应用默认布局
    applyLayout('default');
    
    // 重置界面选项
    showBordersCheckbox.checked = true;
    showTitlesCheckbox.checked = true;
    transparentBgCheckbox.checked = false;
    
    // 重置滤镜
    cameraFilter.value = 'filter-normal';
    screenFilter.value = 'filter-normal';
    cameraPreview.className = 'filter-normal';
    screenPreview.className = 'filter-normal';
    
    // 重置背景设置，考虑当前主题模式
    backgroundType.value = 'color';
    if (isDarkMode) {
        backgroundColor.value = '#1e1e1e'; // 黑暗模式的默认背景色
    } else {
        backgroundColor.value = '#f0f0f0'; // 浅色模式的默认背景色
    }
    backgroundImage.value = '';
    
    // 显示正确的背景选项
    backgroundColor.style.display = 'block';
    document.querySelector('.image-upload-container').style.display = 'none';
    gradientColorEnd.style.display = 'none';
    gradientDirection.style.display = 'none';
    
    // 重置水印设置
    showWatermarkCheckbox.checked = true;
    watermarkText.value = '多功能媒体工具 | ikdxhz.top';
    watermarkOpacity.value = 70;
    watermarkSize.value = 16;
    if (isDarkMode) {
        watermarkColor.value = '#e0e0e0'; // 黑暗模式的默认水印颜色
    } else {
        watermarkColor.value = '#ffffff'; // 浅色模式的默认水印颜色
    }
    
    // 更新UI
    updateInterfaceOptions();
    updateBackground();
    updateWatermarkPreview();
    
    // 清除保存的水印位置
    localStorage.removeItem('watermarkPosition');
}

// 设置滤镜控制
function setupFilterControls() {
    // 摄像头滤镜变化
    cameraFilter.addEventListener('change', function() {
        // 移除所有可能的滤镜类
        cameraPreview.className = '';
        // 添加选择的滤镜类
        cameraPreview.classList.add(this.value);
    });
    
    // 屏幕共享滤镜变化
    screenFilter.addEventListener('change', function() {
        // 移除所有可能的滤镜类
        screenPreview.className = '';
        // 添加选择的滤镜类
        screenPreview.classList.add(this.value);
    });
}

// 停止摄像头
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        cameraPreview.srcObject = null;
        takePhotoBtn.disabled = true;
        showStatus(cameraStatus, '摄像头已停止');
        
        if (!screenStream) {
            recordVideoBtn.disabled = true;
        }
    }
}

// 停止屏幕共享
function stopScreenShare() {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
        screenPreview.srcObject = null;
        screenShotBtn.disabled = true;
        showStatus(screenStatus, '屏幕共享已停止');
        
        if (!cameraStream) {
            recordVideoBtn.disabled = true;
        }
    }
}

// 停止音频
function stopAudio() {
    if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        audioAnalyser = null;
        showStatus(audioStatus, '麦克风已停止');
    }
}

// 停止所有媒体
function stopAllMedia() {
    // 停止录制
    if (isRecording) {
        stopRecording();
    }
    
    // 停止摄像头
    stopCamera();
    
    // 停止屏幕共享
    stopScreenShare();
    
    // 停止音频
    stopAudio();
    
    showStatus(document.querySelector('.status-message'), '所有媒体已停止');
}

// 拍照功能
function takePhoto() {
    if (!cameraStream) {
        showError(cameraError, '摄像头未开启');
        return;
    }
    
    // 创建一个临时canvas来捕获图像
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 设置canvas尺寸与视频相同
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    
    // 绘制视频帧到canvas
    context.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
    
    // 应用滤镜效果
    if (cameraPreview.className && cameraPreview.className !== 'filter-normal') {
        applyCanvasFilter(context, {x: 0, y: 0, width: canvas.width, height: canvas.height}, cameraPreview.className);
    }
    
    // 转换为图片URL
    try {
        const imageURL = canvas.toDataURL('image/png');
        
        // 创建输出项
        createImageOutput(imageURL, '摄像头照片');
        
    } catch (error) {
        showError(cameraError, '无法捕获照片: ' + error.message);
    }
}

// 屏幕截图功能
function takeScreenshot() {
    if (!screenStream) {
        showError(screenError, '屏幕共享未开启');
        return;
    }
    
    // 创建一个临时canvas来捕获图像
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 设置canvas尺寸与视频相同
    canvas.width = screenPreview.videoWidth;
    canvas.height = screenPreview.videoHeight;
    
    // 绘制视频帧到canvas
    context.drawImage(screenPreview, 0, 0, canvas.width, canvas.height);
    
    // 应用滤镜效果
    if (screenPreview.className && screenPreview.className !== 'filter-normal') {
        applyCanvasFilter(context, {x: 0, y: 0, width: canvas.width, height: canvas.height}, screenPreview.className);
    }
    
    // 转换为图片URL
    try {
        const imageURL = canvas.toDataURL('image/png');
        
        // 创建输出项
        createImageOutput(imageURL, '屏幕截图');
        
    } catch (error) {
        showError(screenError, '无法捕获截图: ' + error.message);
    }
}

// 创建图片输出项
function createImageOutput(imageURL, title) {
    // 创建输出容器
    const outputItem = document.createElement('div');
    outputItem.className = 'output-item';
    
    // 添加标题
    const outputTitle = document.createElement('h3');
    outputTitle.textContent = title;
    outputItem.appendChild(outputTitle);
    
    // 添加时间戳
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleString();
    outputItem.appendChild(timestamp);
    
    // 添加图片
    const image = document.createElement('img');
    image.src = imageURL;
    image.style.width = '100%';
    image.style.borderRadius = '4px';
    image.style.marginTop = '10px';
    outputItem.appendChild(image);
    
    // 添加下载按钮
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-button';
    downloadBtn.textContent = '下载';
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = imageURL;
        link.download = title + '_' + new Date().toISOString().replace(/:/g, '-') + '.png';
        link.click();
    });
    outputItem.appendChild(downloadBtn);
    
    // 添加到输出区域
    outputArea.insertBefore(outputItem, outputArea.firstChild);
}

// 开始录制
function startRecording() {
    if (isRecording) {
        showError(document.getElementById('global-error'), '已经在录制中');
        return;
    }
    
    // 检查是否至少有一个视频源
    if (!cameraStream && !screenStream) {
        showError(document.getElementById('global-error'), '请先开启摄像头或屏幕共享');
        return;
    }
    
    // 检查视频元素是否准备好
    if (screenStream && (!screenPreview.videoWidth || !screenPreview.videoHeight)) {
        showError(document.getElementById('global-error'), '屏幕视频尚未准备好，请稍等几秒再尝试录制');
        return;
    }
    
    if (cameraStream && (!cameraPreview.videoWidth || !cameraPreview.videoHeight)) {
        showError(document.getElementById('global-error'), '摄像头视频尚未准备好，请稍等几秒再尝试录制');
        return;
    }
    
    try {
        // 记录录制开始时间
        const startTime = new Date();
        
        // 创建记录时间的元素
        const timeDisplay = document.createElement('div');
        timeDisplay.id = 'recording-time';
        timeDisplay.style.position = 'absolute';
        timeDisplay.style.top = '10px';
        timeDisplay.style.left = '10px';
        timeDisplay.style.background = 'rgba(255, 0, 0, 0.7)';
        timeDisplay.style.color = 'white';
        timeDisplay.style.padding = '5px 10px';
        timeDisplay.style.borderRadius = '4px';
        timeDisplay.style.fontSize = '14px';
        timeDisplay.style.zIndex = '1000';
        timeDisplay.textContent = '00:00';
        mediaContainer.appendChild(timeDisplay);
        
        // 更新计时器
        const updateTimer = setInterval(() => {
            const elapsed = Math.floor((new Date() - startTime) / 1000);
            const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const seconds = (elapsed % 60).toString().padStart(2, '0');
            timeDisplay.textContent = `${minutes}:${seconds}`;
        }, 1000);
        
        // 准备录制流
        let recordStream;
        
        if (cameraStream && screenStream) {
            // 使用Canvas合成两个视频流
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置Canvas大小与屏幕流一致
            canvas.width = screenPreview.videoWidth || 1280;
            canvas.height = screenPreview.videoHeight || 720;
            
            // 计算摄像头预览的位置和大小 (画中画效果)
            // 防止除以零错误
            let aspectRatio = 4/3; // 默认宽高比
            if (cameraPreview.videoWidth && cameraPreview.videoHeight) {
                aspectRatio = cameraPreview.videoHeight / cameraPreview.videoWidth;
            }
            
            const camWidth = canvas.width / 4; // 摄像头宽度为屏幕宽度的1/4
            const camHeight = camWidth * aspectRatio;
            const camX = canvas.width - camWidth - 20; // 右下角
            const camY = canvas.height - camHeight - 20;
            
            // 创建用于合成的媒体流
            const compositeStream = canvas.captureStream(30); // 30fps
            
            // 添加音频轨道如果存在
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => {
                    compositeStream.addTrack(track);
                });
            }
            
            // 定义绘制函数 (在外部定义，防止在动画循环中重复创建)
            const drawFrame = () => {
                if (!isRecording) return;
                
                try {
                    // 绘制屏幕共享
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    if (screenStream && screenStream.active) {
                        ctx.drawImage(screenPreview, 0, 0, canvas.width, canvas.height);
                    }
                    
                    // 绘制摄像头画面 (画中画)
                    if (cameraStream && cameraStream.active) {
                        ctx.drawImage(cameraPreview, camX, camY, camWidth, camHeight);
                        
                        // 添加边框
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(camX, camY, camWidth, camHeight);
                    }
                    
                    // 如果仍在录制，继续下一帧
                    if (isRecording) {
                        requestAnimationFrame(drawFrame);
                    }
                } catch (error) {
                    console.error('绘制画面时出错:', error);
                    stopRecording();
                }
            };
            
            // 开始绘制循环
            requestAnimationFrame(drawFrame);
            
            recordStream = compositeStream;
        } else if (cameraStream) {
            recordStream = cameraStream;
            
            // 添加音频轨道如果存在
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => {
                    recordStream.addTrack(track);
                });
            }
        } else {
            recordStream = screenStream;
            
            // 添加音频轨道如果存在
            if (audioStream) {
                audioStream.getAudioTracks().forEach(track => {
                    recordStream.addTrack(track);
                });
            }
        }
        
        // 设置录制选项 - 尝试使用兼容性更好的编码器
        let options;
        try {
            options = { mimeType: 'video/webm;codecs=vp9,opus' };
            mediaRecorder = new MediaRecorder(recordStream, options);
        } catch (e) {
            try {
                options = { mimeType: 'video/webm;codecs=vp8,opus' };
                mediaRecorder = new MediaRecorder(recordStream, options);
            } catch (e) {
                try {
                    options = { mimeType: 'video/webm' };
                    mediaRecorder = new MediaRecorder(recordStream, options);
                } catch (e) {
                    showError(document.getElementById('global-error'), '浏览器不支持WebM格式录制');
                    return;
                }
            }
        }
        
        // 收集录制的数据
        recordedChunks = [];
        mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        // 录制结束后处理
        mediaRecorder.onstop = () => {
            // 清除计时器
            clearInterval(updateTimer);
            
            // 移除时间显示
            if (timeDisplay.parentNode) {
                timeDisplay.parentNode.removeChild(timeDisplay);
            }
            
            // 检查是否有数据
            if (recordedChunks.length === 0) {
                showError(document.getElementById('global-error'), '未录制到任何数据');
                isRecording = false;
                recordVideoBtn.disabled = false;
                stopRecordingBtn.disabled = true;
                recordVideoBtn.classList.remove('active-record');
                return;
            }
            
            try {
                // 创建Blob并生成URL
                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const videoURL = URL.createObjectURL(blob);
                
                // 创建视频输出
                createVideoOutput(videoURL);
                
                // 重置状态
                isRecording = false;
                recordVideoBtn.disabled = false;
                stopRecordingBtn.disabled = true;
                
                // 移除记录按钮的动画效果
                recordVideoBtn.classList.remove('active-record');
            } catch (error) {
                console.error('处理录制视频时出错:', error);
                showError(document.getElementById('global-error'), '无法处理录制的视频: ' + error.message);
            }
        };
        
        // 开始录制
        mediaRecorder.start(1000); // 每秒触发一次ondataavailable事件
        isRecording = true;
        
        // 更新按钮状态
        recordVideoBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        
        // 添加录制动画效果
        recordVideoBtn.classList.add('active-record');
        
        showStatus(document.querySelector('.status-message'), '录制已开始');
        
    } catch (error) {
        console.error('录制失败:', error);
        showError(document.getElementById('global-error'), '无法开始录制: ' + error.message);
    }
}

// 停止录制
function stopRecording() {
    if (!isRecording || !mediaRecorder) {
        return;
    }
    
    try {
        // 停止录制器
        mediaRecorder.stop();
        
        // 设置状态，通知绘制函数停止绘制
        isRecording = false;
        
        showStatus(document.querySelector('.status-message'), '录制已停止');
    } catch (error) {
        console.error('停止录制时出错:', error);
        showError(document.getElementById('global-error'), '停止录制时出错: ' + error.message);
        
        // 重置状态
        isRecording = false;
        recordVideoBtn.disabled = false;
        stopRecordingBtn.disabled = true;
    }
}

// 设置主题模式功能
function setupThemeMode() {
    // 检查本地存储中的主题偏好
    const savedTheme = localStorage.getItem('theme');
    
    // 如果已保存了主题偏好
    if (savedTheme) {
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            updateThemeIcon(true);
        }
    } 
    // 如果没有保存主题偏好，检查系统偏好
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon(true);
    }
    
    // 监听系统主题变化
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) { // 只有在用户没有手动设置主题时才跟随系统
                const isDarkMode = e.matches;
                document.body.classList.toggle('dark-mode', isDarkMode);
                updateThemeIcon(isDarkMode);
                updateUIForTheme(isDarkMode);
            }
        });
    }

    // 主题切换按钮点击事件
    themeToggle.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        
        // 保存主题偏好到本地存储
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        // 更新图标
        updateThemeIcon(isDarkMode);
        
        // 根据主题更新UI元素
        updateUIForTheme(isDarkMode);
    });
    
    // 初始化UI，确保与当前主题匹配
    const currentIsDarkMode = document.body.classList.contains('dark-mode');
    updateUIForTheme(currentIsDarkMode);
}

// 更新主题图标
function updateThemeIcon(isDarkMode) {
    themeToggle.textContent = isDarkMode ? '☀️' : '🌓';
    themeToggle.title = isDarkMode ? '切换到浅色模式' : '切换到深色模式';
}

// 根据主题更新UI元素
function updateUIForTheme(isDarkMode) {
    // 更新背景
    updateBackground();
    
    // 更新界面选项
    updateInterfaceOptions();
    
    // 更新水印预览
    updateWatermarkPreview();
    
    // 更新预览区域背景色
    const previewAreas = document.querySelectorAll('.preview-area');
    previewAreas.forEach(area => {
        if (showBordersCheckbox.checked) {
            area.style.backgroundColor = isDarkMode ? '#1e1e1e' : 'white';
            area.style.border = isDarkMode ? '1px solid #333' : '1px solid #ddd';
            area.style.boxShadow = isDarkMode ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.1)';
        }
    });
    
    // 更新预览标题颜色
    const previewTitles = document.querySelectorAll('.preview-title');
    previewTitles.forEach(title => {
        title.style.color = isDarkMode ? '#90caf9' : '#1976D2';
    });
    
    // 更新状态消息背景色
    const statusMessages = document.querySelectorAll('.status-message');
    statusMessages.forEach(message => {
        message.style.backgroundColor = isDarkMode ? '#333' : '#f5f5f5';
        message.style.color = isDarkMode ? '#aaa' : '#757575';
    });
    
    // 更新按钮外观
    document.querySelectorAll('.bg-preset').forEach(preset => {
        if (preset.classList.contains('active')) {
            preset.style.color = 'white';
            preset.style.backgroundColor = '#4CAF50';
        } else {
            preset.style.backgroundColor = isDarkMode ? '#333' : '#f0f0f0';
            preset.style.color = isDarkMode ? '#e0e0e0' : 'initial';
            preset.style.borderColor = isDarkMode ? '#444' : '#ddd';
        }
    });
    
    // 根据主题调整表单元素样式
    const selects = document.querySelectorAll('select');
    const inputs = document.querySelectorAll('input[type="text"], input[type="number"]');
    
    selects.forEach(select => {
        select.style.backgroundColor = isDarkMode ? '#333' : '';
        select.style.color = isDarkMode ? '#e0e0e0' : '';
        select.style.borderColor = isDarkMode ? '#444' : '';
    });
    
    inputs.forEach(input => {
        input.style.backgroundColor = isDarkMode ? '#333' : '';
        input.style.color = isDarkMode ? '#e0e0e0' : '';
        input.style.borderColor = isDarkMode ? '#444' : '';
    });
    
    // 更新技术特点和站点特色区域
    const techFeatures = document.querySelector('.tech-features');
    if (techFeatures) {
        techFeatures.style.backgroundColor = isDarkMode ? '#1a1a2e' : '#f0f8ff';
        techFeatures.style.boxShadow = isDarkMode ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.05)';
        
        // 更新标题
        const titles = techFeatures.querySelectorAll('h2, h3');
        titles.forEach(title => {
            title.style.color = isDarkMode ? '#90caf9' : '#333';
        });
        
        // 更新列表文本
        const lists = techFeatures.querySelectorAll('ul');
        lists.forEach(list => {
            list.style.color = isDarkMode ? '#e0e0e0' : '#333';
        });
    }
    
    // 更新站点特色区域
    const siteFeatures = document.querySelector('.site-features');
    if (siteFeatures) {
        siteFeatures.style.backgroundColor = isDarkMode ? '#1a1a2e' : '#fff';
        siteFeatures.style.boxShadow = isDarkMode ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.1)';
        
        // 安全提示框
        const safetyHighlight = siteFeatures.querySelector('.safety-highlight');
        if (safetyHighlight) {
            safetyHighlight.style.backgroundColor = isDarkMode ? '#1a237e' : '#e3f2fd';
            const safetyTitle = safetyHighlight.querySelector('h3');
            if (safetyTitle) {
                safetyTitle.style.color = isDarkMode ? '#90caf9' : '#1565c0';
            }
            const safetyText = safetyHighlight.querySelector('p');
            if (safetyText) {
                safetyText.style.color = isDarkMode ? '#e0e0e0' : '#333';
            }
        }
        
        // 功能项
        const featureItems = siteFeatures.querySelectorAll('.feature-item');
        featureItems.forEach(item => {
            item.style.backgroundColor = isDarkMode ? '#282828' : '#f9f9f9';
            const title = item.querySelector('h3');
            if (title) {
                title.style.color = isDarkMode ? '#90caf9' : '#2196F3';
            }
            const text = item.querySelector('p');
            if (text) {
                text.style.color = isDarkMode ? '#bbb' : '#666';
            }
        });
    }
    
    // 更新关于网站区域
    const aboutSite = document.querySelector('.about-site');
    if (aboutSite) {
        aboutSite.style.backgroundColor = isDarkMode ? '#212121' : '#f5f5f5';
        const aboutHeader = aboutSite.querySelector('.about-header h2');
        if (aboutHeader) {
            aboutHeader.style.color = isDarkMode ? '#e0e0e0' : '#333';
        }
        const aboutContent = aboutSite.querySelectorAll('.about-content p');
        aboutContent.forEach(p => {
            p.style.color = isDarkMode ? '#bbb' : '';
        });
    }
    
    // 更新页脚
    const footer = document.querySelector('footer');
    if (footer) {
        footer.style.color = isDarkMode ? '#aaa' : '#666';
        footer.style.borderTop = isDarkMode ? '1px solid #333' : '1px solid #eee';
        const links = footer.querySelectorAll('a');
        links.forEach(link => {
            link.style.color = isDarkMode ? '#90caf9' : '#2196F3';
        });
    }
}

// 在DOMContentLoaded中初始化所有功能
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否为移动设备
    if (isMobileDevice()) {
        // 创建警告元素
        const mobileWarning = document.createElement('div');
        mobileWarning.className = 'mobile-warning';
        mobileWarning.innerHTML = `
            <div class="warning-content">
                <h3>⚠️ 移动设备访问受限</h3>
                <p>抱歉，由于移动设备生态限制，本工具在移动设备上功能受限。</p>
                <p>请使用桌面浏览器访问以获得完整体验。</p>
                <button class="warning-close">我知道了</button>
            </div>
        `;
        document.body.appendChild(mobileWarning);
        
        // 添加关闭按钮事件
        const closeBtn = mobileWarning.querySelector('.warning-close');
        closeBtn.addEventListener('click', function() {
            mobileWarning.style.display = 'none';
        });
        
        // 禁用屏幕共享按钮
        document.getElementById('start-screen').disabled = true;
        document.getElementById('start-screen').title = "移动设备不支持屏幕共享";
    }
    
    // 使所有预览区域可拖拽和调整大小
    document.querySelectorAll('.preview-area').forEach(area => {
        makeDraggable(area);
        makeResizable(area);
    });
    
    // 设置初始层级
    const initialZIndices = {
        'camera-preview-container': 3,  // 摄像头在最上层
        'screen-preview-container': 2,  // 屏幕共享在中间层
        'audio-preview-container': 1    // 音频在底层
    };
    
    // 应用初始层级
    Object.entries(initialZIndices).forEach(([id, zIndex]) => {
        const element = document.getElementById(id);
        if (element) {
            element.style.zIndex = zIndex.toString();
        }
    });
    
    // 初始化各种控制功能
    setupLayerControls();
    setupPureMode();
    setupWatermarkControls();
    setupBackgroundControls();
    setupLayoutControls();
    setupFilterControls();
    
    // 媒体控制按钮事件
    startCameraBtn.addEventListener('click', startCamera);
    startScreenBtn.addEventListener('click', startScreenShare);
    startAudioBtn.addEventListener('click', startAudio);
    stopAllBtn.addEventListener('click', stopAllMedia);
    
    takePhotoBtn.addEventListener('click', takePhoto);
    screenShotBtn.addEventListener('click', takeScreenshot);
    recordVideoBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);
    
    // 初始化updateVisibleElements函数的调用
    setTimeout(updateVisibleElements, 100);
    
    // 初始化时更新一次水印预览
    setTimeout(updateWatermarkPreview, 500);
    
    // 初始化时更新界面选项
    updateInterfaceOptions();
    
    // 初始化主题模式
    setupThemeMode();
}); 

// 创建视频输出
function createVideoOutput(videoURL) {
    // 创建输出容器
    const outputItem = document.createElement('div');
    outputItem.className = 'output-item';
    
    // 添加标题
    const outputTitle = document.createElement('h3');
    outputTitle.textContent = '录制视频';
    outputItem.appendChild(outputTitle);
    
    // 添加时间戳
    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleString();
    outputItem.appendChild(timestamp);
    
    // 添加视频
    const video = document.createElement('video');
    video.src = videoURL;
    video.controls = true;
    video.style.width = '100%';
    video.style.borderRadius = '4px';
    video.style.marginTop = '10px';
    outputItem.appendChild(video);
    
    // 添加下载按钮
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-button';
    downloadBtn.textContent = '下载';
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = videoURL;
        link.download = '录制视频_' + new Date().toISOString().replace(/:/g, '-') + '.webm';
        link.click();
    });
    outputItem.appendChild(downloadBtn);
    
    // 添加到输出区域
    outputArea.insertBefore(outputItem, outputArea.firstChild);
} 