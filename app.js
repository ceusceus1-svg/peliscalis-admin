// Credenciales de acceso
const ADMIN_USERNAME = 'israeldual';
const ADMIN_PASSWORD = '111222444';

// Datos de contenido
let contenido = {
    categorias: []
};

// Estado de la aplicación
let currentCategoryId = null;
let currentMovieId = null;
let editingCategoryId = null;
let editingMovieId = null;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Verificar si hay contenido guardado
    const savedContent = localStorage.getItem('peliscalis_content');
    if (savedContent) {
        try {
            contenido = JSON.parse(savedContent);
        } catch (e) {
            console.error('Error cargando contenido guardado:', e);
        }
    }

    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
    document.getElementById('syncGitHubBtn').addEventListener('click', syncToGitHub);
    document.getElementById('githubConfigBtn').addEventListener('click', openGitHubConfigModal);
    document.getElementById('downloadJsonBtn').addEventListener('click', downloadJSON);
    document.getElementById('loadJsonBtn').addEventListener('click', () => document.getElementById('jsonFileInput').click());
    document.getElementById('jsonFileInput').addEventListener('change', handleFileLoad);
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySubmit);
    document.getElementById('movieForm').addEventListener('submit', handleMovieSubmit);
    document.getElementById('githubConfigForm').addEventListener('submit', handleGitHubConfigSubmit);
    
    // Color picker sync
    document.getElementById('colorPicker').addEventListener('input', (e) => {
        document.getElementById('categoryColor').value = e.target.value;
    });
    document.getElementById('categoryColor').addEventListener('input', (e) => {
        if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
            document.getElementById('colorPicker').value = e.target.value;
        }
    });

    // Cerrar modales
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    // Verificar si está logueado
    const isLoggedIn = sessionStorage.getItem('peliscalis_logged_in');
    if (isLoggedIn === 'true') {
        showMainScreen();
    }
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('peliscalis_logged_in', 'true');
        errorDiv.classList.remove('show');
        showMainScreen();
    } else {
        errorDiv.textContent = 'Usuario o contraseña incorrectos';
        errorDiv.classList.add('show');
    }
}

function handleLogout() {
    sessionStorage.removeItem('peliscalis_logged_in');
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
    renderCategories();
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    
    if (contenido.categorias.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No hay categorías</h2>
                <p>Crea tu primera categoría para empezar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = contenido.categorias.map(categoria => {
        const peliculasHTML = categoria.peliculas.map(pelicula => `
            <div class="movie-card">
                <h3>${escapeHtml(pelicula.titulo)}</h3>
                <p>${escapeHtml(pelicula.subtitulo)}</p>
                <div class="movie-actions">
                    <button class="btn-secondary" onclick="editMovie('${categoria.id}', '${pelicula.id}')">✏️ Editar</button>
                    <button class="btn-danger" onclick="deleteMovie('${categoria.id}', '${pelicula.id}')">🗑️ Eliminar</button>
                </div>
            </div>
        `).join('');

        return `
            <div class="category-card" style="border-left-color: ${categoria.colorHex}">
                <div class="category-header">
                    <h2 style="color: ${categoria.colorHex}">${escapeHtml(categoria.nombre)}</h2>
                    <div class="category-actions">
                        <button class="btn-primary" onclick="openMovieModal('${categoria.id}')">➕ Película</button>
                        <button class="btn-secondary" onclick="editCategory('${categoria.id}')">✏️ Editar</button>
                        <button class="btn-danger" onclick="deleteCategory('${categoria.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
                <div class="movies-list">
                    ${peliculasHTML}
                    <button class="btn-primary add-movie-btn" onclick="openMovieModal('${categoria.id}')">
                        ➕ Añadir Película
                    </button>
                </div>
            </div>
        `;
    }).join('');

    saveContent();
}

function openCategoryModal(categoryId = null) {
    editingCategoryId = categoryId;
    const modal = document.getElementById('categoryModal');
    const form = document.getElementById('categoryForm');
    const title = document.getElementById('modalCategoryTitle');

    if (categoryId) {
        const categoria = contenido.categorias.find(c => c.id === categoryId);
        title.textContent = 'Editar Categoría';
        document.getElementById('categoryId').value = categoria.id;
        document.getElementById('categoryId').disabled = true;
        document.getElementById('categoryName').value = categoria.nombre;
        document.getElementById('categoryColor').value = categoria.colorHex;
        document.getElementById('colorPicker').value = categoria.colorHex;
    } else {
        title.textContent = 'Nueva Categoría';
        form.reset();
        document.getElementById('categoryId').disabled = false;
        document.getElementById('categoryColor').value = '#E50914';
        document.getElementById('colorPicker').value = '#E50914';
    }

    modal.classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
    document.getElementById('categoryForm').reset();
    editingCategoryId = null;
}

function openMovieModal(categoryId, movieId = null) {
    currentCategoryId = categoryId;
    editingMovieId = movieId;
    const modal = document.getElementById('movieModal');
    const form = document.getElementById('movieForm');
    const title = document.getElementById('modalMovieTitle');

    document.getElementById('movieCategoryId').value = categoryId;

    if (movieId) {
        const categoria = contenido.categorias.find(c => c.id === categoryId);
        const pelicula = categoria.peliculas.find(p => p.id === movieId);
        title.textContent = 'Editar Película';
        document.getElementById('movieId').value = pelicula.id;
        document.getElementById('movieId').disabled = true;
        document.getElementById('movieTitle').value = pelicula.titulo;
        document.getElementById('movieSubtitle').value = pelicula.subtitulo;
        document.getElementById('movieImageUrl').value = pelicula.imagenUrl;
        document.getElementById('movieLink').value = pelicula.enlace;
    } else {
        title.textContent = 'Nueva Película';
        form.reset();
        document.getElementById('movieCategoryId').value = categoryId;
        document.getElementById('movieId').disabled = false;
    }

    modal.classList.add('active');
}

function closeMovieModal() {
    document.getElementById('movieModal').classList.remove('active');
    document.getElementById('movieForm').reset();
    currentCategoryId = null;
    editingMovieId = null;
}

function handleCategorySubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('categoryId').value;
    const nombre = document.getElementById('categoryName').value;
    const colorHex = document.getElementById('categoryColor').value;

    if (editingCategoryId) {
        // Editar categoría existente
        const categoria = contenido.categorias.find(c => c.id === editingCategoryId);
        categoria.nombre = nombre;
        categoria.colorHex = colorHex;
    } else {
        // Nueva categoría
        if (contenido.categorias.find(c => c.id === id)) {
            alert('Ya existe una categoría con ese ID');
            return;
        }
        contenido.categorias.push({
            id: id,
            nombre: nombre,
            colorHex: colorHex,
            peliculas: []
        });
    }

    closeCategoryModal();
    renderCategories();
}

function handleMovieSubmit(e) {
    e.preventDefault();
    
    const categoryId = document.getElementById('movieCategoryId').value;
    const id = document.getElementById('movieId').value;
    const titulo = document.getElementById('movieTitle').value;
    const subtitulo = document.getElementById('movieSubtitle').value;
    const imagenUrl = document.getElementById('movieImageUrl').value;
    const enlace = document.getElementById('movieLink').value;

    const categoria = contenido.categorias.find(c => c.id === categoryId);

    if (editingMovieId) {
        // Editar película existente
        const pelicula = categoria.peliculas.find(p => p.id === editingMovieId);
        pelicula.titulo = titulo;
        pelicula.subtitulo = subtitulo;
        pelicula.imagenUrl = imagenUrl;
        pelicula.enlace = enlace;
    } else {
        // Nueva película
        if (categoria.peliculas.find(p => p.id === id)) {
            alert('Ya existe una película con ese ID en esta categoría');
            return;
        }
        categoria.peliculas.push({
            id: id,
            titulo: titulo,
            subtitulo: subtitulo,
            imagenUrl: imagenUrl,
            enlace: enlace,
            categoriaId: categoryId
        });
    }

    closeMovieModal();
    renderCategories();
}

function editCategory(categoryId) {
    openCategoryModal(categoryId);
}

function editMovie(categoryId, movieId) {
    openMovieModal(categoryId, movieId);
}

function deleteCategory(categoryId) {
    if (confirm('¿Estás seguro de eliminar esta categoría? Se eliminarán todas sus películas.')) {
        contenido.categorias = contenido.categorias.filter(c => c.id !== categoryId);
        renderCategories();
    }
}

function deleteMovie(categoryId, movieId) {
    if (confirm('¿Estás seguro de eliminar esta película?')) {
        const categoria = contenido.categorias.find(c => c.id === categoryId);
        categoria.peliculas = categoria.peliculas.filter(p => p.id !== movieId);
        renderCategories();
    }
}

function downloadJSON() {
    const jsonStr = JSON.stringify(contenido, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contenido.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const loadedContent = JSON.parse(event.target.result);
            if (loadedContent.categorias && Array.isArray(loadedContent.categorias)) {
                contenido = loadedContent;
                renderCategories();
                alert('Contenido cargado correctamente');
            } else {
                alert('Formato de JSON inválido');
            }
        } catch (error) {
            alert('Error al cargar el archivo: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function saveContent() {
    localStorage.setItem('peliscalis_content', JSON.stringify(contenido));
}

// Funciones de sincronización GitHub
async function syncToGitHub() {
    const statusDiv = document.getElementById('syncStatus');
    const config = githubSync.getConfig();
    
    if (!config.username || !config.token) {
        statusDiv.style.display = 'block';
        statusDiv.style.background = '#ff4444';
        statusDiv.style.color = 'white';
        statusDiv.textContent = '❌ Por favor configura GitHub primero (click en "Config GitHub")';
        return;
    }

    statusDiv.style.display = 'block';
    statusDiv.style.background = '#333';
    statusDiv.style.color = 'white';
    statusDiv.textContent = '⏳ Subiendo a GitHub...';

    try {
        await githubSync.uploadToGitHub(contenido);
        statusDiv.style.background = '#00FF88';
        statusDiv.style.color = '#000';
        statusDiv.innerHTML = '✅ ¡Subido exitosamente a GitHub!<br>URL de la app: <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">' + githubSync.getRawContentUrl() + '</code>';
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    } catch (error) {
        statusDiv.style.background = '#ff4444';
        statusDiv.style.color = 'white';
        statusDiv.textContent = '❌ Error: ' + error.message;
    }
}

function openGitHubConfigModal() {
    const modal = document.getElementById('githubConfigModal');
    const config = githubSync.getConfig();
    
    document.getElementById('githubUsername').value = config.username || '';
    document.getElementById('githubRepo').value = config.repo || 'peliscalis-content';
    document.getElementById('githubToken').value = config.token || '';
    
    modal.classList.add('active');
}

function closeGitHubConfigModal() {
    document.getElementById('githubConfigModal').classList.remove('active');
}

function handleGitHubConfigSubmit(e) {
    e.preventDefault();
    
    const config = {
        username: document.getElementById('githubUsername').value.trim(),
        repo: document.getElementById('githubRepo').value.trim(),
        branch: 'main',
        token: document.getElementById('githubToken').value.trim()
    };
    
    githubSync.saveConfig(config);
    closeGitHubConfigModal();
    
    // Mostrar mensaje de éxito
    const statusDiv = document.getElementById('syncStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#00FF88';
    statusDiv.style.color = '#000';
    statusDiv.textContent = '✅ Configuración guardada. Ahora puedes usar "Subir a GitHub"';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Nota: Para auto-sincronizar, descomenta esto y modifica saveContent()
// let autoSyncEnabled = localStorage.getItem('auto_sync') === 'true';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hacer funciones disponibles globalmente para onclick
window.editCategory = editCategory;
window.editMovie = editMovie;
window.deleteCategory = deleteCategory;
window.deleteMovie = deleteMovie;
window.openMovieModal = openMovieModal;
window.closeCategoryModal = closeCategoryModal;
window.closeMovieModal = closeMovieModal;
window.closeGitHubConfigModal = closeGitHubConfigModal;

