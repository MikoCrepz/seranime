const API_BASE = 'https://www.sankavollerei.com';

let allAnimeList = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentCategory = 'home';
let currentSearchQuery = null;
let totalItems = 0;
let totalPages = 1;

const savedState = JSON.parse(localStorage.getItem('animeStreamState')) || {};
currentCategory = savedState.currentCategory || 'home';
currentPage = parseInt(savedState.currentPage) || 1;
currentSearchQuery = savedState.currentSearchQuery || null;

const mainContent = document.getElementById('main-content');
const playerModal = document.getElementById('player-modal');
const streamFrame = document.getElementById('stream-frame');
const playerTitle = document.getElementById('player-title');

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.getAttribute('data-page');
        setActiveNav(e.target);

        currentSearchQuery = null;
        currentPage = 1;

        if (page === 'home') {
            loadHome();
            history.pushState({category: 'home', page: 1}, '', '?page=home');
        } else if (page === 'ongoing') {
            loadOngoing();
            history.pushState({category: 'ongoing', page: 1}, '', '?page=ongoing');
        } else if (page === 'complete') {
            loadComplete();
            history.pushState({category: 'complete', page: 1}, '', '?page=complete');
        } else if (page === 'schedule') {
            loadSchedule();
            history.pushState({category: 'schedule', page: 1}, '', '?page=schedule');
        } else if (page === 'genre') {
            loadGenres();
            history.pushState({category: 'genre', page: 1}, '', '?page=genre');
        }
    });
});

document.getElementById('search-btn').addEventListener('click', performSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

document.querySelector('.close').addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === playerModal) closeModal();
});

window.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const animeSlug = urlParams.get('anime');
    const pageParam = urlParams.get('page');

    if (animeSlug) {
        viewAnimeDetail(animeSlug);
    } else if (pageParam) {
        switch (pageParam) {
            case 'home':
                loadHome();
                break;
            case 'ongoing':
                loadOngoing();
                break;
            case 'complete':
                loadComplete();
                break;
            case 'schedule':
                loadSchedule();
                break;
            case 'genre':
                loadGenres();
                break;
            default:
                loadHome();
        }
    } else {
        loadHome();
    }
});

window.addEventListener('popstate', (event) => {
    if (event.state && event.state.animeSlug) {
        viewAnimeDetail(event.state.animeSlug);
    } else if (event.state && event.state.category) {
        const { category, page } = event.state;
        currentPage = page;
        switch (category) {
            case 'home':
                loadHome();
                break;
            case 'ongoing':
                loadOngoing(currentPage);
                break;
            case 'complete':
                loadComplete();
                break;
            case 'schedule':
                loadSchedule();
                break;
            case 'genre':
                loadGenres();
                break;
        }
    } else {
        loadHome();
    }
});

function setActiveNav(element) {
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    if (element.textContent === 'Complete') {
        element.textContent = 'List Anime';
    }
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link !== element && link.textContent === 'List Anime') {
            link.textContent = 'Complete';
        }
    });
    element.classList.add('active');
    saveState();
}

function showLoading() {
    mainContent.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

function renderError(message) {
    mainContent.innerHTML = `
        <div class="error" style="text-align: center; padding: 2rem; color: #ff6b6b;">
            <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
            <h2>Error</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--accent); color: var(--bg); border: none; border-radius: 5px; cursor: pointer;">Muat Ulang</button>
        </div>
    `;
}

async function fetchAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('API Response:', data);
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(`Gagal memuat ${error.message}`);
    }
}

function saveState() {
    const state = {
        currentCategory,
        currentPage,
        currentSearchQuery
    };
    localStorage.setItem('animeStreamState', JSON.stringify(state));
}

async function loadHome() {
    showLoading();
    currentCategory = 'home';
    try {
        const rawData = await fetchAPI('/anime/home');
        if (rawData.status !== 'success') {
            throw new Error('API mengembalikan status tidak sukses.');
        }

        allAnimeList = rawData.data?.ongoing_anime || [];
        totalItems = allAnimeList.length;
        totalPages = Math.ceil(totalItems / itemsPerPage);

        renderAnimeGridWithPagination(
            allAnimeList.slice(0, itemsPerPage),
            'Anime Sedang Tayang',
            1,
            totalPages
        );
    } catch (error) {
        renderError(error.message);
    }
}

async function loadOngoing(page = 1) {
    showLoading();
    currentCategory = 'ongoing';
    try {
        const rawData = await fetchAPI(`/anime/ongoing-anime?page=${page}`);
        if (rawData.status !== 'success') {
            throw new Error('API mengembalikan status tidak sukses.');
        }

        const animeList = rawData.data?.ongoingAnimeData || [];
        const paginationData = rawData.data?.paginationData;

        currentPage = paginationData?.current_page || page;
        totalPages = paginationData?.last_visible_page || 1;

        renderAnimeGridWithPagination(animeList, 'Anime Sedang Tayang', currentPage, totalPages);
    } catch (error) {
        renderError(error.message);
    }
}

async function loadComplete(page = 1) {
    showLoading();
    currentCategory = 'complete';
    console.log("loadComplete dipanggil (menampilkan semua anime dari /anime/unlimited)");

    try {
        const rawData = await fetchAPI(`/anime/unlimited`);
        console.log("Raw API Response untuk /anime/unlimited:", rawData);

        if (rawData.status !== 'success') {
            throw new Error('API mengembalikan status tidak sukses.');
        }

        const fullList = rawData.data?.list;

        if (!Array.isArray(fullList)) {
            console.warn("'rawData.data.list' bukan array. Struktur data mungkin berbeda.", typeof fullList);
            renderError("Gagal memuat List Anime. Data tidak ditemukan.");
            return;
        }

        renderAllAnimeByLetter(fullList);

    } catch (error) {
        console.error("Error di loadComplete:", error);
        renderError("Gagal memuat List Anime. " + error.message);
    }
}

function renderAllAnimeByLetter(animeSections) {
    let html = `<h1 class="section-title"><i class="fas fa-list"></i> List Anime</h1>`;

    if (animeSections.length > 0) {
        animeSections.forEach(section => {
            const letter = section.startWith || 'Unknown';
            const animeList = section.animeList || [];

            if (animeList.length > 0) {
                html += `<h2 class="section-title" style="font-size: 1.6rem; margin-top: 1.5rem; border-bottom: 2px solid var(--accent); padding-bottom: 0.3rem;">${letter}</h2>`;
                html += `<div class="anime-grid">`;

                animeList.forEach(anime => {
                    const slug = anime.animeId || '#';
                    const title = anime.title || 'Judul Tidak Diketahui';
                    const poster = 'https://via.placeholder.com/300x400?text=No+Image';

                    html += `
                        <div class="anime-card" onclick="viewAnimeDetail('${slug}')">
                            <img src="${poster}" alt="${title}" class="anime-poster">
                            <div class="anime-info">
                                <h3 class="anime-title">${title}</h3>
                                <div class="anime-meta">
                                    <span>Anime</span>
                                    <span class="episode-count"></span>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
            } else {
                 html += `<h2 class="section-title" style="font-size: 1.6rem; margin-top: 1.5rem; border-bottom: 2px solid var(--accent); padding-bottom: 0.3rem;">${letter}</h2>`;
                 html += `<p style="grid-column: 1 / -1; text-align: center; padding: 1rem; color: #aaa;">Tidak ada anime.</p>`;
            }
        });
    } else {
        html += `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Tidak ada anime ditemukan.</p>`;
    }

    mainContent.innerHTML = html;
}

function renderAnimeGridWithPagination(animeList, title, page = 1, totalPages = 1) {
    currentPage = page;

    let html = `<h1 class="section-title"><i class="fas fa-list"></i> ${title}</h1>`;

    if (animeList.length > 0) {
        html += `<div class="anime-grid">`;
        animeList.forEach(anime => {
            const slug = anime.slug || '#';
            const title = anime.title || 'Judul Tidak Diketahui';
            const poster = anime.poster || 'https://via.placeholder.com/300x400?text=No+Image';

            let type = 'Anime';
            let episodes = '??';
            let additionalInfo = '';

            if (anime.current_episode) {
                type = 'Ongoing';
                episodes = anime.current_episode;
                if (anime.release_day) {
                    additionalInfo = `<div style="font-size: 0.8rem; color: #777; margin-top: 0.25rem;"><i class="fas fa-calendar-day"></i> ${anime.release_day}</div>`;
                }
            } else if (anime.episode_count) {
                type = 'Complete';
                episodes = `${anime.episode_count} Ep`;
                if (anime.rating) {
                    additionalInfo = `<div style="font-size: 0.8rem; color: #777; margin-top: 0.25rem;">⭐ ${anime.rating}</div>`;
                }
                if (anime.last_release_date) {
                    additionalInfo += `<div style="font-size: 0.8rem; color: #777;">📅 ${anime.last_release_date}</div>`;
                }
            }

            html += `
                <div class="anime-card" onclick="viewAnimeDetail('${slug}')">
                    <img src="${poster}" alt="${title}" class="anime-poster">
                    <div class="anime-info">
                        <h3 class="anime-title">${title}</h3>
                        <div class="anime-meta">
                            <span>${type}</span>
                            <span class="episode-count">${episodes}</span>
                        </div>
                        ${additionalInfo}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Tidak ada anime ditemukan.</p>`;
    }

    if (totalPages > 1) {
        html += `
            <div class="pagination">
                ${currentPage > 1 ? `<button class="page-btn" onclick="changePage(${currentPage - 1})">Prev</button>` : ''}
                ${generatePageNumbers(currentPage, totalPages).map(p =>
                    `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="changePage(${p})">${p}</button>`
                ).join('')}
                ${currentPage < totalPages ? `<button class="page-btn" onclick="changePage(${currentPage + 1})">Next</button>` : ''}
            </div>
        `;
    }

    mainContent.innerHTML = html;
}

function generatePageNumbers(currentPage, totalPages) {
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
    }

    if (currentPage - delta > 2) {
        range.unshift('...');
        range.unshift(1);
    }
    if (currentPage + delta < totalPages - 1) {
        range.push('...');
        range.push(totalPages);
    }

    if (totalPages > 1 && !range.includes(1)) range.unshift(1);
    if (totalPages > 1 && !range.includes(totalPages)) range.push(totalPages);

    return range;
}

async function changePage(page) {
    if (page === '...') return;
    if (page < 1 || page > totalPages) return;

    if (currentCategory === 'ongoing') {
        loadOngoing(page);
        history.pushState({category: 'ongoing', page: page}, '', `?page=ongoing&pg=${page}`);
    } else if (currentCategory === 'home') {
        currentPage = page;
        renderAnimeGridWithPagination(
            allAnimeList.slice((page - 1) * itemsPerPage, page * itemsPerPage),
            'Anime Sedang Tayang',
            page,
            totalPages
        );
        history.pushState({category: 'home', page: page}, '', `?page=home&pg=${page}`);
    } else if (currentSearchQuery) {
        searchAnime(currentSearchQuery, page);
        history.pushState({search: currentSearchQuery, page: page}, '', `?search=${encodeURIComponent(currentSearchQuery)}&pg=${page}`);
    }

    saveState();
}

async function viewAnimeDetail(slug) {
    showLoading();
    try {
        const rawData = await fetchAPI(`/anime/anime/${slug}`);
        if (rawData.status !== 'success') {
            throw new Error('Gagal memuat detail anime.');
        }

        const anime = rawData.data;
        renderAnimeDetail(anime);

        const newUrl = `?anime=${slug}`;
        history.pushState({animeSlug: slug}, '', newUrl);

    } catch (error) {
        renderError(`Gagal memuat detail anime: ${error.message}`);
    }
}

function renderAnimeDetail(anime) {
    const title = anime.title || 'Judul Tidak Diketahui';
    const poster = anime.poster || 'https://via.placeholder.com/300x400?text=No+Image';
    const type = anime.type || 'Jenis Tidak Diketahui';
    const status = anime.status || 'Status Tidak Diketahui';
    const episode_count = anime.episode_count || '??';
    const genre = Array.isArray(anime.genres) ? anime.genres.map(g => g.name).join(', ') : 'Genre Tidak Diketahui';
    const release = anime.release_date || 'Tanggal Rilis Tidak Diketahui';
    const studio = anime.studio || 'Studio Tidak Diketahui';
    const duration = anime.duration || 'Durasi Tidak Diketahui';
    const rating = anime.rating || 'Rating Tidak Diketahui';
    const synopsis = anime.synopsis || 'Sinopsis tidak tersedia.';
    const episodes = anime.episode_lists || [];

    let html = `
        <div class="detail-container">
            <img src="${poster}" alt="${title}" class="detail-poster">
            <div class="detail-info">
                <h1 class="detail-title">${title}</h1>
                <div class="detail-meta">
                    <div class="meta-item"><i class="fas fa-bookmark"></i> ${status}</div>
                    <div class="meta-item"><i class="fas fa-film"></i> ${episode_count} Ep</div>
                    <div class="meta-item"><i class="fas fa-calendar"></i> ${release}</div>
                    <div class="meta-item"><i class="fas fa-clock"></i> ${duration}</div>
                    <div class="meta-item"><i class="fas fa-star"></i> ${rating}</div>
                    <div class="meta-item"><i class="fas fa-users"></i> ${studio}</div>
                    <div class="meta-item"><i class="fas fa-video"></i> ${type}</div>
                </div>
                <div class="detail-genres">
                    ${anime.genres ? anime.genres.map(g => `<span class="genre-tag">${g.name}</span>`).join(' ') : ''}
                </div>
                <div class="detail-synopsis">
                    <h3>Sinopsis:</h3>
                    <p>${synopsis}</p>
                </div>
            </div>
        </div>
        <h2 class="section-title"><i class="fas fa-play"></i> Daftar Episode</h2>
        <div class="episode-list">
    `;

    if (episodes.length > 0) {
        episodes.forEach(ep => {
            const epSlug = ep.slug || '#';
            const epNumber = ep.episode_number || '??';
            const epTitle = ep.episode || `Episode ${epNumber}`;
            html += `
                <div class="episode-item" onclick="openEpisodeInNewTab('${epSlug}')">
                    <div class="episode-number">Ep ${epNumber}</div>
                    <div style="font-size: 0.8rem; color: #aaa;">${epTitle}</div>
                    <button class="play-btn" onclick="event.stopPropagation(); openEpisodeInNewTab('${epSlug}')">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `;
        });
    } else {
        html += `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Tidak ada episode ditemukan.</p>`;
    }

    html += `</div>`;
    mainContent.innerHTML = html;
}

function openEpisodeInNewTab(slug) {
    window.open(`episode.html?slug=${slug}`, '_blank');
}

function closeModal() {
    playerModal.style.display = 'none';
    if (streamFrame) {
        streamFrame.src = '';
    }
}

async function searchAnime(keyword, page = 1) {
    currentSearchQuery = keyword;
    showLoading();
    try {
        const rawData = await fetchAPI(`/anime/search/${encodeURIComponent(keyword)}`);
        if (rawData.status !== 'success') {
            throw new Error('Pencarian gagal.');
        }

        const animeList = rawData.data || [];
        totalItems = rawData.total || animeList.length;
        totalPages = rawData.total_pages || Math.ceil(totalItems / itemsPerPage);

        renderAnimeGridWithPagination(animeList, `Hasil Pencarian: "${keyword}"`, page, totalPages);

        saveState();
    } catch (error) {
        renderError(`Pencarian gagal: ${error.message}`);
    }
}

function performSearch() {
    const keyword = document.getElementById('search-input').value.trim();
    if (!keyword) return;
    currentPage = 1;
    searchAnime(keyword);
    saveState();
}

async function loadGenres() {
    showLoading();
    try {
        const rawData = await fetchAPI('/anime/genre');
        if (rawData.status !== 'success') {
            throw new Error('Gagal memuat genre.');
        }

        const genres = rawData.data || [];
        renderGenres(genres);
    } catch (error) {
        renderError(`Gagal memuat genre: ${error.message}`);
    }
}

function renderGenres(genres) {
    let html = `<h1 class="section-title"><i class="fas fa-tags"></i> Daftar Genre</h1>`;
    html += `<div class="anime-grid">`;

    if (genres.length > 0) {
        genres.forEach(genre => {
            const name = genre.name || 'Nama Genre';
            const count = genre.count || 0;
            const slug = genre.slug || '#';
            html += `
                <div class="anime-card" onclick="loadAnimeByGenre('${slug}')">
                    <div style="display: flex; justify-content: center; align-items: center; height: 280px; background: var(--secondary); font-size: 1.5rem;">
                        <span>${name}</span>
                    </div>
                    <div class="anime-info">
                        <h3 class="anime-title">${name}</h3>
                        <div class="anime-meta">
                            <span>Anime</span>
                            <span class="episode-count">${count}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html += `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Tidak ada genre ditemukan.</p>`;
    }

    html += `</div>`;
    mainContent.innerHTML = html;
}

async function loadAnimeByGenre(slug, page = 1) {
    showLoading();
    try {
        const rawData = await fetchAPI(`/anime/genre/${slug}?page=${page}`);
        if (rawData.status !== 'success') {
            throw new Error('Gagal memuat anime genre.');
        }

        const animeList = rawData.data?.anime || [];
        const paginationData = rawData.data?.pagination;

        currentPage = paginationData?.current_page || page;
        totalPages = paginationData?.last_visible_page || 1;

        renderAnimeGridWithPagination(animeList, `Anime Genre: ${slug}`, currentPage, totalPages);
    } catch (error) {
        renderError(`Gagal memuat anime genre: ${error.message}`);
    }
}

async function loadSchedule() {
    showLoading();
    try {
        const rawData = await fetchAPI('/anime/schedule');
        if (rawData.status !== 'success') {
            throw new Error('Gagal memuat jadwal.');
        }

        const schedule = rawData.data || [];
        renderSchedule(schedule);
    } catch (error) {
        renderError(`Gagal memuat jadwal: ${error.message}`);
    }
}

function renderSchedule(schedule) {
    let html = `<h1 class="section-title"><i class="fas fa-calendar-alt"></i> Jadwal Rilis Anime</h1>`;

    if (!Array.isArray(schedule) || schedule.length === 0) {
        html += `<p style="text-align: center; padding: 2rem;">Tidak ada jadwal ditemukan.</p>`;
        mainContent.innerHTML = html;
        return;
    }

    schedule.forEach((daySection, index) => {
        const dayName = daySection.day || `Hari ${index}`;
        const animeList = daySection.anime_list || [];

        html += `<h2 class="section-title" style="font-size: 1.4rem; margin-top: 1.5rem;">${dayName}</h2>`;
        html += `<div class="anime-grid">`;

        if (animeList.length > 0) {
            animeList.forEach(anime => {
                const slug = anime.slug || '#';
                const title = anime.anime_name || 'Judul Tidak Diketahui';
                const poster = anime.poster || 'https://via.placeholder.com/300x400?text=No+Image';
                html += `
                    <div class="anime-card" onclick="viewAnimeDetail('${slug}')">
                        <img src="${poster}" alt="${title}" class="anime-poster">
                        <div class="anime-info">
                            <h3 class="anime-title">${title}</h3>
                            <div class="anime-meta">
                                <span>${anime.release_day || 'Hari'}</span>
                                <span class="episode-count">${anime.current_episode || '??'}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p style="grid-column: 1 / -1; text-align: center; padding: 1rem;">Tidak ada anime.</p>`;
        }

        html += `</div>`;
    });

    mainContent.innerHTML = html;
}

(() => {
     const key = 'supportModalDontShow';

     if (localStorage.getItem(key) === 'true') return;

     window.addEventListener('load', () => {
        document.getElementById('supportModal').classList.add('show');
     });
    })();

    function closeModal() {
     const checked = document.getElementById('dontShowAgain').checked;

     if (checked) {
        localStorage.setItem('supportModalDontShow', 'true');
     } else {
        localStorage.removeItem('supportModalDontShow');
     }

     document.getElementById('supportModal').classList.remove('show');
    }

    function openBugReportModal() {
        document.getElementById('page-url').value = window.location.href;
        document.getElementById('page-title').value = document.title;
        document.getElementById('bug-report-modal').style.display = 'flex';
    }

    function closeBugReportModal() {
        document.getElementById('bug-report-modal').style.display = 'none';
        document.getElementById('bug-description').value = '';
    }

    document.getElementById('bug-report-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const description = document.getElementById('bug-description').value.trim();
        const url = document.getElementById('page-url').value;
        const title = document.getElementById('page-title').value;

        if (!description) {
            alert("Deskripsi bug tidak boleh kosong.");
            return;
        }

        try {
            const webhookUrl = 'https://discord.com/api/webhooks/1444484521365082234/4kIrn0IgyvZHcoJpeSAjJ7sGW2MrvUfmxr5Hjvo-BIHfgaUc3t0I28tXE6S_uw1JUQAH';

            const payload = {
                content: null,
                embeds: [{
                    title: "Laporan Bug Baru",
                    fields: [
                        { name: "Deskripsi", value: description },
                        { name: "URL Halaman", value: url, inline: true },
                        { name: "Judul Halaman", value: title, inline: true },
                        { name: "Timestamp", value: new Date().toISOString() }
                    ],
                    color: 16711680,
                    footer: {
                        text: "AnimeStream Bug Reporter"
                    }
                }],
                attachments: []
            };

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert("Laporan bug berhasil dikirim. Terima kasih!");
                closeBugReportModal();
            } else {
                console.error("Gagal mengirim laporan bug:", response.status, response.statusText);
                alert("Gagal mengirim laporan. Silakan coba lagi nanti.");
            }
        } catch (error) {
            console.error("Error mengirim laporan bug:", error);
            alert("Gagal mengirim laporan: " + error.message);
        }
    });

    document.querySelector('#bug-report-modal .close').addEventListener('click', closeBugReportModal);
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('bug-report-modal');
        if (e.target === modal) closeBugReportModal();
    });