// Sincronización con GitHub API
class GitHubSync {
    constructor() {
        this.config = this.loadConfig();
    }

    loadConfig() {
        const saved = localStorage.getItem('github_config');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            username: '',
            repo: 'peliscalis-content',
            branch: 'main',
            token: ''
        };
    }

    saveConfig(config) {
        this.config = config;
        localStorage.setItem('github_config', JSON.stringify(config));
    }

    getConfig() {
        return this.config;
    }

    async uploadToGitHub(jsonContent) {
        if (!this.config.username || !this.config.token) {
            throw new Error('Por favor configura tu usuario y token de GitHub primero');
        }

        const filePath = 'contenido.json';
        const apiUrl = `https://api.github.com/repos/${this.config.username}/${this.config.repo}/contents/${filePath}`;
        
        // Primero, obtener el SHA del archivo actual (si existe)
        let sha = null;
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            }
        } catch (e) {
            // Archivo no existe, lo crearemos
        }

        // Codificar contenido en base64
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(jsonContent, null, 2))));
        
        // Subir o actualizar archivo
        const body = {
            message: `Actualizar contenido - ${new Date().toLocaleString('es-ES')}`,
            content: content,
            branch: this.config.branch
        };

        if (sha) {
            body.sha = sha;
        }

        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${this.config.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al subir a GitHub');
        }

        return await response.json();
    }

    getRawContentUrl() {
        if (!this.config.username || !this.config.repo) {
            return '';
        }
        return `https://raw.githubusercontent.com/${this.config.username}/${this.config.repo}/${this.config.branch}/contenido.json`;
    }
}

const githubSync = new GitHubSync();

