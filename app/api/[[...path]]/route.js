// Route upload simple (stockage des URLs seulement)
if (path === '/upload-simple') {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const type = formData.get('type');
    const url = formData.get('url'); // URL déjà uploadée
    
    if (url) {
      // Si une URL est déjà fournie (uploadé côté client)
      return NextResponse.json({
        success: true,
        url: url,
        method: 'external_url'
      }, { headers: corsHeaders });
    }
    
    // Sinon, retourner des instructions
    return NextResponse.json({
      success: false,
      error: 'Upload direct non disponible',
      instructions: [
        '1. Uploader le fichier vers un service cloud (Cloudinary, Imgur, etc.)',
        '2. Récupérer l\'URL publique',
        '3. Envoyer cette URL avec le paramètre "url"'
      ],
      example_request: {
        url: 'https://example.com/image.jpg',
        type: 'cover'
      }
    }, { status: 400, headers: corsHeaders });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
