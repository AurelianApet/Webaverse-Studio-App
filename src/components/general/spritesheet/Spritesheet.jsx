import React, {useEffect, useState, useRef} from 'react';
import classnames from 'classnames';
import styles from './spritesheet.module.css';
import spriteAnimationManager from '../../../../sprite-animation-manager.js';

//

export const Spritesheet = ({
    className,
    startUrl,
    size,
    numFrames,
}) => {
    // console.log('spritesheet url', startUrl);
    const [ spritesheet, setSpritesheet ] = useState(null);
    const canvasRef = useRef();

    const numFramesPow2 = Math.pow(2, Math.ceil(Math.log2(numFrames)));
    const numFramesPerRow = Math.ceil(Math.sqrt(numFramesPow2));
    const frameSize = size / numFramesPerRow;
    const frameLoopTime = 2000;
    const frameTime = frameLoopTime / numFrames;

    useEffect(() => {
        if (startUrl) {
            let live = true;
            (async () => {
                const spritesheet = await spriteAnimationManager.getSpriteAnimationForAppUrlAsync(startUrl, {
                    size,
                    numFrames,
                });

                if (!live) {
                    return;
                }
                setSpritesheet(spritesheet);
            })();
            return () => {
              live = false;
            };
        }
    }, [startUrl]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && spritesheet) {
            const ctx = canvas.getContext('2d');
            const imageBitmap = spritesheet.result;
            // console.log('render image bitmap', imageBitmap, size, canvas.width, canvas.height);
            // ctx.drawImage(imageBitmap, 0, 0, size, size, 0, 0, canvas.width, canvas.height);

            let frameIndex = 0;
            const _recurse = () => {
                const x = (frameIndex % numFramesPerRow) * frameSize;
                const y = size - frameSize - Math.floor(frameIndex / numFramesPerRow) * frameSize;
                frameIndex = (frameIndex + 1) % numFrames;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(imageBitmap, x, y, frameSize, frameSize, 0, 0, canvas.width, canvas.height);
            };
            const interval = setInterval(_recurse, frameTime);
            return () => {
                clearInterval(interval);
            };
        }
    }, [canvasRef, spritesheet]);

    return (
        <canvas
            className={classnames(className, styles.canvas)}
            width={frameSize}
            height={frameSize}
            ref={canvasRef}
        />
    );
};