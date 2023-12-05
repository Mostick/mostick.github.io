import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// const ffmpeg = new FFmpeg();

// const load = async () => {
//     const ffmpeg = new FFmpeg();
//     const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
//     ffmpeg.on('log', log => {
//         console.log(log);
//     });
//     // toBlobURL is used to bypass CORS issue, urls with the same
//     // domain can be used directly.
//     await ffmpeg.load({
//         coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
//         wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
//     });
// };

const transcode = async videoUrl => {
    const ffmpeg = new FFmpeg();
    // const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
    const baseURL = '.';

    ffmpeg.on('log', log => {
        console.log(log);
    });

    ffmpeg.on('progress', event => {
        console.log(event);
    });

    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    await ffmpeg.writeFile('input.webm', await fetchFile(videoUrl));
    // await ffmpeg.exec(['-i', 'input.webm', '-vcodec', 'copy', '-q:v', '0', '-b:v', '3000k', 'output.mp4']);
    await ffmpeg.exec(['-i', 'input.webm', '-vcodec', 'copy', '-q:v', '0', '-b:v', '3000k', '-fflags', '+genpts', 'output.mp4']);
    const data = await ffmpeg.readFile('output.mp4');

    return URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
};

// THIS CODE FOR MULTI THREAD
// const load = async () => {
//     const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.4/dist/umd';
//     ffmpeg.on('log', ({ message }) => {
//         console.log(message);
//     });
//     // toBlobURL is used to bypass CORS issue, urls with the same
//     // domain can be used directly.
//     await ffmpeg.load({
//         coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
//         wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
//         workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
//     });
// };
//
// const transcode = async videoUrl => {
//     await ffmpeg.writeFile('input.webm', await fetchFile(videoUrl));
//     await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
//     const data = await ffmpeg.readFile('output.mp4');
//     const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = 'video';
//     link.click();
// };

// void load();
window.transcode = transcode;
