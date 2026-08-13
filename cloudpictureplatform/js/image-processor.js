// 圖片處理模組

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_SIZE = 300; // 縮圖尺寸

/**
 * 壓縮圖片
 */
function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file.type.match(/^image\//)) {
            reject(new Error('不是有效的圖片檔案'));
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 计算新尺寸
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve({
                                blob: blob,
                                width: width,
                                height: height
                            });
                        } else {
                            reject(new Error('图片压缩失败'));
                        }
                    },
                    file.type,
                    quality
                );
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

/**
 * 生成缩略图
 */
function generateThumbnail(file, size = THUMBNAIL_SIZE) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 计算缩略图尺寸（保持比例）
                if (width > height) {
                    if (width > size) {
                        height = (height * size) / width;
                        width = size;
                    }
                } else {
                    if (height > size) {
                        width = (width * size) / height;
                        height = size;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('缩略图生成失败'));
                        }
                    },
                    'image/jpeg',
                    0.8
                );
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

/**
 * 获取图片尺寸
 */
function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

/**
 * 验证文件
 */
function validateFile(file) {
    // 检查文件类型
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
        return {
            valid: false,
            error: '不支持的文件格式，请选择JPG、PNG或WebP格式的图片'
        };
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `文件大小超过限制（最大${formatFileSize(MAX_FILE_SIZE)}）`
        };
    }

    return { valid: true };
}

/**
 * 创建图片预览URL
 */
function createImagePreview(file) {
    try {
        if (!file) {
            throw new Error('文件对象无效');
        }
        return URL.createObjectURL(file);
    } catch (error) {
        console.error('创建预览URL失败:', error);
        return '';
    }
}

/**
 * 释放预览URL
 */
function revokeImagePreview(url) {
    URL.revokeObjectURL(url);
}


