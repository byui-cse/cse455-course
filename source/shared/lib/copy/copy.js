document.addEventListener('DOMContentLoaded', (event) => {
    const codeBlocks = document.querySelectorAll('pre code');

    codeBlocks.forEach(codeBlock => {
        const button = document.createElement('button');
        button.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy';
        button.classList.add('copy-button');
        button.addEventListener('click', () => {
            const code = codeBlock.innerText;
            navigator.clipboard.writeText(code).then(() => {
                button.innerHTML = '<span class="material-symbols-outlined green">check</span> Code Copied!';
                setTimeout(() => {
                    button.innerHTML = '<span class="material-symbols-outlined">content_copy</span> Copy';
                }, 5000);
            }).catch(err => {
                console.error('Could not copy text: ', err);
            });
        });

        const container = document.createElement('div');
        container.classList.add('code-container');
        codeBlock.parentNode.parentNode.insertBefore(container, codeBlock.parentNode);
        container.appendChild(button);
        container.appendChild(codeBlock.parentNode);
    });
});