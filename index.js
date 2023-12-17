let withUserInfoRecorder;
let simpleRecorder;
let checkmark;
let fontList = [];

const API_KEY = 'AIzaSyACCEBmessvgVjxOJRRTg8t7_OCfJEl6KM';
const DEFAULT_STATE = {
    avatar: 'https://pbs.twimg.com/profile_images/1617646545733816321/wgRxM8jP_400x400.jpg',
    userName: 'Justin Evergreen',
    userNick: '@justin.evergreen',
    speed: 25,
    imgSize: 120,
    paddingY: 192,
    fontSizeNum: 60,
    lineHeight: 90,
    nameFontSize: 40,
    nickFontSize: 40,
    paddingX: 120,
    checkmarkSize: 48,
    imageMarginRight: 20,
    imageMarginBottom: 140,
    colorText: '#536471',
    colorName: '#536471',
    colorNick: '#536471',
    colorBackground: '#f7f9fc',
    fontSize: '60px',
    font: { family: 'Roboto', isDefault: true },
    render: 'sequentially',
};

const fontPreloaderStatus = status => {
    const preloader = document.querySelector('.preloader');

    preloader.style.display = status ? '' : 'none';
};

const fetchFontList = async () => {
    const request = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`);
    const response = await request.json();
    const fontList = response.items.filter(font => {
        if (!font.subsets.includes('latin')) return false;
        if (!font.subsets.includes('cyrillic')) return false;
        if (!font.variants.includes('regular')) return false;
        if (!font.variants.includes('300')) return false;
        if (!font.variants.includes('700')) return false;

        return true;
    });

    return fontList;
};

const fetchFont = async font => {
    const googleFontRegular = new FontFace(font.family, `url(${font.files['regular'].replace(/https?/, 'https')})`, { weight: 'normal' });
    const googleFont300 = new FontFace(font.family, `url(${font.files['300'].replace(/https?/, 'https')})`, { weight: '300' });
    const googleFont700 = new FontFace(font.family, `url(${font.files['700'].replace(/https?/, 'https')})`, { weight: '700' });

    fontPreloaderStatus(true);

    const loadedFonts = await Promise.all([googleFontRegular.load(), googleFont300.load(), googleFont700.load()]);

    loadedFonts.forEach(loadedFont => {
        document.fonts.add(loadedFont);
    });

    fontPreloaderStatus(false);
};

const setState = object => {
    const currentState = getState();
    const newState = {
        ...currentState,
        ...object,
    };

    localStorage.setItem('state', JSON.stringify(newState));
};

const getState = key => {
    let state;

    try {
        state = JSON.parse(localStorage.getItem('state'));

        if (!state) throw new Error('No state');
    } catch (e) {
        state = DEFAULT_STATE;
    }

    return key ? state[key] : state;
};

const preloadImage = src => {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');

        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

const preloadAvatar = () => {
    const avatar = getState('avatar');
    return preloadImage(avatar);
};

const preloadCheckmark = () => {
    return preloadImage('./checkmark.png');
};

const record = canvas => {
    const recordedChunks = [];
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=h264',
        videoBitsPerSecond: 3000000,
    });

    const customPromise = new Promise(function (res) {
        mediaRecorder.start();

        mediaRecorder.ondataavailable = function (event) {
            console.log('event', event);
            recordedChunks.push(event.data);
        };

        mediaRecorder.onerror = e => {
            console.log('onerror', e);
        };

        mediaRecorder.onstop = function () {
            console.log('mediaRecorder.onstop');
            let blob = new Blob(recordedChunks, { type: 'video/webm' });
            let url = URL.createObjectURL(blob);
            res(url);
        };
    });

    return {
        customPromise,
        mediaRecorder,
    };
};

const splitOnRows = (ctx, text, maxWidth) => {
    let rowIndex = 0;

    const rows = [''];
    const sentences = text.split('\n');
    const words = (() => {
        let result = [];

        sentences.forEach(sentence => {
            const singleWords = sentence.trim().split(' ');
            result.push(...singleWords);
            if (sentence !== '') result.push('');
        });

        return result;
    })();

    for (let i = 0; i < words.length; i++) {
        const currentWord = words[i];
        const currentRow = (rows[rowIndex] + ' ' + currentWord).trim();
        const rowWidth = ctx.measureText(currentRow).width;
        const newLines = [...currentWord].filter(i => i === '\n').length;

        if (currentWord === '') {
            rowIndex++;
            rows[rowIndex] = '';
            continue;
        }

        if (newLines > 0) {
            for (let m = 0; m < newLines - 1; m++) {
                rowIndex++;
                rows[rowIndex] = '';
            }

            rowIndex++;
            rows[rowIndex] = currentWord.replace('\n', '');
        } else if (rowWidth <= maxWidth) {
            rows[rowIndex] = currentRow;
        } else {
            rowIndex++;
            rows[rowIndex] = currentWord;
        }
    }

    // console.log('splitOnRows', rows);

    return rows;
};

class AnimationRecorder {
    constructor(canvas, sliderTextList, withUserInfo, fileName = 'video') {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fileName = fileName;
        this.withUserInfo = withUserInfo;
        this.sliderTextList = sliderTextList;
        this.currentSlide = 0;
        this.recorder = record(canvas);
        this.mediaRecorder = this.recorder.mediaRecorder;
        this.isRecording = false;
    }

    get isLastSlide() {
        return !this.sliderTextList[this.currentSlide + 1];
    }

    downloadVideos(callback) {
        this.recorder.customPromise.then(async url => {
            const mp4BlobUrl = await transcode(url);
            const link = document.createElement('a');

            link.setAttribute('download', this.fileName);
            link.setAttribute('href', mp4BlobUrl);
            link.click();

            callback?.();
        });

        console.log('Convert WEBM to MP4...');

        setTimeout(() => {
            this.mediaRecorder.stop();
        }, 3000);
    }

    drawUserInfo(x, y, avatarImg) {
        const state = getState();
        const { imageMarginRight, imgSize, nameFontSize, colorName, colorNick, userName, userNick, nickFontSize, checkmarkSize, font } =
            state;
        let userNameWidth = 0;
        const marginRight = imageMarginRight;
        const avatarX = x;
        const avatarY = y;
        const userNameX = avatarX + imgSize + marginRight;
        const userNameY = avatarY + imgSize / 2 - nameFontSize;
        const nickNameX = userNameX;
        const nickNameY = userNameY + nameFontSize;

        const drawAvatar = () => {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(avatarX + imgSize / 2, avatarY + imgSize / 2, imgSize / 2, 0, Math.PI * 2, true);
            this.ctx.closePath();
            this.ctx.clip();
            this.ctx.drawImage(avatarImg, avatarX, avatarY, imgSize, imgSize);
            this.ctx.restore();
        };

        const drawUserName = () => {
            this.ctx.save();
            this.ctx.fillStyle = colorName;
            this.ctx.font = `bold ${nameFontSize}px ${font.family}`;

            userNameWidth = this.ctx.measureText(userName).width;

            this.ctx.fillText(userName, userNameX, userNameY);
            this.ctx.restore();
        };

        const drawNickName = () => {
            this.ctx.save();
            this.ctx.fillStyle = colorNick;
            this.ctx.font = `${nickFontSize}px ${font.family}`;
            this.ctx.fillText(userNick, nickNameX, nickNameY);
            this.ctx.restore();
        };

        const drawCheckmark = () => {
            const checkmarkX = userNameX + userNameWidth + 8;
            const checkmarkY = userNameY + nameFontSize / 2 - checkmarkSize / 2;

            this.ctx.drawImage(checkmark, checkmarkX, checkmarkY, checkmarkSize, checkmarkSize);
        };

        drawAvatar();
        drawUserName();
        drawNickName();
        drawCheckmark();
    }

    drawBackground() {
        const colorBackground = getState('colorBackground');

        this.ctx.save();
        this.ctx.fillStyle = colorBackground;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
    }

    async simpleRenderText(textList) {
        if (this.isRecording) return;

        const state = getState();
        const { imgSize, imageMarginBottom, lineHeight, paddingX, paddingY, fontSize, font, colorText } = state;

        this.ctx.textBaseline = 'top';
        this.ctx.font = `${fontSize} ${font.family}, cursive`;
        this.ctx.fillStyle = colorText;

        const text = textList[0] || this.sliderTextList[0] || '';
        const splittedText = splitOnRows(this.ctx, text, this.canvas.width - paddingX * 2);
        const x = paddingX;
        const y = paddingY;
        const avatarImg = await preloadAvatar();

        this.drawBackground();
        if (this.withUserInfo) this.drawUserInfo(x, y, avatarImg);

        const y1 = y + (imgSize + imageMarginBottom / 2);

        for (let i = 0; i < splittedText.length; i++) {
            this.ctx.fillText(splittedText[i], x, y1 + lineHeight * i);
        }
    }

    async animationRenderText(params, onEnd) {
        const state = getState();
        const { imgSize, imageMarginBottom, lineHeight } = state;
        let { x, y, splittedText, speed } = params;
        let firstEmptyFrames = 2; // Fix bug with the first frame

        splittedText[splittedText.length - 1] += '    '; // Fix bug with missing last frames

        let intervalId = 0;
        let counter = 0;
        let currentTextLength = 0;
        let rowIndex = 0;
        let splittedTextLength = splittedText.join(' ').length;
        let avatarImg = await preloadAvatar();

        this.isRecording = true;

        let draw = () => {
            const currentRow = splittedText[rowIndex];

            if (currentRow === undefined) {
                console.warn('Warning! Something happens.');
                clearInterval(intervalId);
                this.isRecording = false;
                onEnd();
                return;
            }

            const currentText = currentRow.slice(0, currentTextLength);

            this.drawBackground();

            if (this.withUserInfo) this.drawUserInfo(x, y, avatarImg);

            const y1 = y + (imgSize + imageMarginBottom / 2);

            for (let i = 0; i <= rowIndex; i++) {
                if (i < rowIndex) {
                    this.ctx.fillText(splittedText[i], x, y1 + lineHeight * i);
                } else {
                    this.ctx.fillText(currentText, x, y1 + lineHeight * rowIndex);
                }
            }

            if (firstEmptyFrames) {
                firstEmptyFrames--;
            } else {
                counter++;
                currentTextLength++;
            }

            if (currentTextLength > currentRow.length) {
                rowIndex++;
                currentTextLength = 0;
            }

            if (counter > splittedTextLength) {
                clearInterval(intervalId);
                this.isRecording = false;
                onEnd();
            }
        };

        intervalId = setInterval(draw, speed);
    }

    runAnimationAndRecording(onEnd) {
        const state = getState();
        const { imgSize, imageMarginBottom, lineHeight, fontSize, font, colorText, colorBackground, paddingX, paddingY, speed } = state;
        const text = this.sliderTextList[this.currentSlide];

        this.ctx.textBaseline = 'top';
        this.ctx.font = `${fontSize} ${font.family}`;
        this.ctx.fillStyle = colorText;

        const splittedText = splitOnRows(this.ctx, text, this.canvas.width - paddingX * 2);
        const x = paddingX;
        const y = paddingY;

        this.animationRenderText({ x, y, splittedText, speed }, () => {
            if (this.isLastSlide) {
                this.downloadVideos(onEnd);
                return;
            }

            setTimeout(() => {
                const y1 = y + (imgSize + imageMarginBottom / 2);

                this.ctx.save();
                this.ctx.fillStyle = colorBackground;
                this.ctx.fillRect(0, y1, this.canvas.width, y1 + lineHeight * splittedText.length - 1);
                this.ctx.restore();

                this.currentSlide++;

                setTimeout(() => {
                    this.runAnimationAndRecording(onEnd);
                }, 500);
            }, 1500);
        });
    }
}

const simpleRender = () => {
    const textAreaList = [...document.querySelectorAll('textarea')];
    const textList = textAreaList.filter(i => i.value.trim()).map(i => i.value);

    if (!withUserInfoRecorder || !simpleRecorder) {
        withUserInfoRecorder = new AnimationRecorder(document.querySelector('#canvas-twitter'), textList, true);
        simpleRecorder = new AnimationRecorder(document.querySelector('#canvas-pure'), textList, false);
    }

    withUserInfoRecorder?.simpleRenderText(textList);
    simpleRecorder?.simpleRenderText(textList);
};

const onInputChange = async e => {
    const input = e.currentTarget;
    const name = input.name;
    const value = input.value;
    const newState = {
        [name]:
            name.includes('color') || name.includes('user') || name.includes('avatar') || name.includes('render') ? value : Number(value),
    };

    if (name === 'fontSizeNum') {
        newState['fontSize'] = value + 'px';
    }

    setState(newState);

    if (name === 'avatar') {
        try {
            await preloadAvatar();
        } catch (e) {
            //
        }
    }

    simpleRender();
};

const onAvatarChange = e => {
    void onInputChange(e);
};

const onFontChange = async e => {
    const value = e.currentTarget.value;
    const font = fontList.find(font => font.family === value);

    await fetchFont(font);

    setState({ font });
    simpleRender();
};

const setupInputsValues = () => {
    const state = getState();

    const avatar = document.querySelector('input[name="avatar"]');
    const userName = document.querySelector('input[name="userName"]');
    const userNick = document.querySelector('input[name="userNick"]');
    const speed = document.querySelector('input[name="speed"]');
    const imgSize = document.querySelector('input[name="imgSize"]');
    const paddingY = document.querySelector('input[name="paddingY"]');
    const fontSizeNum = document.querySelector('input[name="fontSizeNum"]');
    const lineHeight = document.querySelector('input[name="lineHeight"]');
    const nameFontSize = document.querySelector('input[name="nameFontSize"]');
    const nickFontSize = document.querySelector('input[name="nickFontSize"]');
    const paddingX = document.querySelector('input[name="paddingX"]');
    const checkmarkSize = document.querySelector('input[name="checkmarkSize"]');
    const imageMarginRight = document.querySelector('input[name="imageMarginRight"]');
    const imageMarginBottom = document.querySelector('input[name="imageMarginBottom"]');
    const colorText = document.querySelector('input[name="colorText"]');
    const colorName = document.querySelector('input[name="colorName"]');
    const colorNick = document.querySelector('input[name="colorNick"]');
    const colorBackground = document.querySelector('input[name="colorBackground"]');
    const renderRadio = document.querySelectorAll('input[name="render"]');
    const textAreaList = [...document.querySelectorAll('textarea')];

    avatar.value = state.avatar;
    userName.value = state.userName;
    userNick.value = state.userNick;
    speed.value = state.speed;
    imgSize.value = state.imgSize;
    paddingY.value = state.paddingY;
    fontSizeNum.value = state.fontSizeNum;
    lineHeight.value = state.lineHeight;
    nameFontSize.value = state.nameFontSize;
    nickFontSize.value = state.nickFontSize;
    paddingX.value = state.paddingX;
    checkmarkSize.value = state.checkmarkSize;
    imageMarginRight.value = state.imageMarginRight;
    imageMarginBottom.value = state.imageMarginBottom;
    colorText.value = state.colorText;
    colorName.value = state.colorName;
    colorNick.value = state.colorNick;
    colorBackground.value = state.colorBackground;

    renderRadio.forEach(radio => {
        radio.value === state.render ? radio.setAttribute('checked', '') : radio.removeAttribute('checked');

        radio.addEventListener('change', onInputChange);
    });

    textAreaList.forEach(textarea => {
        textarea.addEventListener('input', simpleRender);
    });

    avatar.addEventListener('input', onAvatarChange);
    userName.addEventListener('input', onInputChange);
    userNick.addEventListener('input', onInputChange);
    speed.addEventListener('change', onInputChange);
    imgSize.addEventListener('change', onInputChange);
    paddingY.addEventListener('change', onInputChange);
    fontSizeNum.addEventListener('change', onInputChange);
    lineHeight.addEventListener('change', onInputChange);
    nameFontSize.addEventListener('change', onInputChange);
    nickFontSize.addEventListener('change', onInputChange);
    paddingX.addEventListener('change', onInputChange);
    checkmarkSize.addEventListener('change', onInputChange);
    imageMarginRight.addEventListener('change', onInputChange);
    imageMarginBottom.addEventListener('change', onInputChange);
    colorText.addEventListener('input', onInputChange);
    colorName.addEventListener('input', onInputChange);
    colorNick.addEventListener('input', onInputChange);
    colorBackground.addEventListener('input', onInputChange);
};

const setupFontSelect = fontList => {
    const { font } = getState();
    const select = document.querySelector('select[name="font"]');

    select.innerHTML = '';

    fontList.forEach(fontItem => {
        const option = document.createElement('option');

        option.value = option.innerHTML = fontItem.family;

        if (fontItem.family === font.family) option.selected = true;

        select.appendChild(option);
    });

    select.addEventListener('change', onFontChange);
};

const onBtnStartAnimationClick = () => {
    const render = getState('render');
    const textAreaList = [...document.querySelectorAll('textarea')];
    const textList = textAreaList.filter(i => i.value.trim()).map(i => i.value);

    withUserInfoRecorder = new AnimationRecorder(document.querySelector('#canvas-twitter'), textList, true, 'twitterVideo');
    simpleRecorder = new AnimationRecorder(document.querySelector('#canvas-pure'), textList, false, 'simpleVideo');

    const disableAllButtons = () => {
        const allButtons = document.querySelectorAll('button');

        allButtons.forEach(button => {
            button.setAttribute('disabled', 'true');
        });
    };

    const enableAllButtons = () => {
        console.log('enableAllButtons');
        const allButtons = document.querySelectorAll('button');

        allButtons.forEach(button => {
            button.removeAttribute('disabled');
        });
    };

    disableAllButtons();

    if (render === 'sequentially') {
        withUserInfoRecorder.runAnimationAndRecording(() => {
            setTimeout(() => {
                simpleRecorder.runAnimationAndRecording(enableAllButtons);
            }, 2000);
        });
    } else {
        withUserInfoRecorder.runAnimationAndRecording(enableAllButtons);
        simpleRecorder.runAnimationAndRecording(enableAllButtons);
    }
};

const initialization = async () => {
    const btnStartAnimation = document.querySelector('button#start-animation');
    const btnAddTextarea = document.querySelector('button#add-textarea');
    const state = getState();
    let currentFont = state.font;

    setupInputsValues();

    void preloadAvatar();
    const [mark, fonts] = await Promise.all([preloadCheckmark(), fetchFontList()]);

    checkmark = mark;
    fontList = fonts;

    if (state.font.isDefault) currentFont = fontList.find(i => i.family === state.font.family);

    await fetchFont(currentFont);

    setupFontSelect(fontList);
    simpleRender();

    btnStartAnimation.addEventListener('click', onBtnStartAnimationClick);
    btnAddTextarea?.addEventListener('click', () => {
        const textareaContainer = document.querySelector('.textarea-list');
        const textarea = document.createElement('textarea');

        textareaContainer.appendChild(textarea);
    });
};

void initialization();
