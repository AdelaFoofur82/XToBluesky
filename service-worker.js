self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname === '/XToBluesky/share-handler' && event.request.method === 'POST') {
        event.respondWith(handleShare(event.request));
    }
});

async function fetchTweetTextFromHTML(tweetUrl) {
    debugger;
    try {
        const response = await fetch(tweetUrl, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`Error al obtener el tweet: ${response.status}`);
        }

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Selecciona el contenido del tweet (puede requerir ajustes si Twitter cambia el DOM)
        const tweetContent = doc.querySelector('meta[property="og:description"]');
        if (tweetContent) {
            return tweetContent.content; // Contenido del meta description
        }

        // Alternativa: Buscar el texto del tweet directamente en el DOM
        const tweetTextNode = doc.querySelector('div[data-testid="tweetText"]');
        if (tweetTextNode) {
            return tweetTextNode.textContent.trim();
        }

        throw new Error('No se pudo extraer el texto del tweet');
    } catch (error) {
        console.error('Error al parsear el contenido del tweet:', error);
        throw error;
    }
}

async function handleShare(request) {
    debugger;
    const formData = await request.formData();
    const sharedText = formData.get('text'); // La URL del tweet estará en `text`

    if (!sharedText || !sharedText.includes('twitter.com')) {
        return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <p>Por favor, comparte un enlace válido de Twitter.</p>
        </body>
        </html>
      `, {
            headers: { 'Content-Type': 'text/html' },
        });
    }

    try {
        const tweetText = await fetchTweetTextFromHTML(sharedText);

        // Redirigir a Bluesky con el texto escapado
        const redirectUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(tweetText)}`;
        return Response.redirect(redirectUrl, 303);
    } catch (error) {
        console.error('Error al manejar el contenido compartido:', error);

        return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Error</title>
        </head>
        <body>
          <h1>Error</h1>
          <p>No se pudo procesar el contenido compartido: ${error.message}</p>
        </body>
        </html>
      `, {
            headers: { 'Content-Type': 'text/html' },
        });
    }
}
