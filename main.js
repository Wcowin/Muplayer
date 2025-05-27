// 音乐播放器主要功能实现

// DOM 元素
const audioPlayer = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const playModeBtn = document.getElementById('play-mode-btn');
const albumArt = document.getElementById('album-art');
const songTitle = document.getElementById('song-title');
const songArtist = document.getElementById('song-artist');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const progressBar = document.querySelector('.progress-bar');
const progress = document.getElementById('progress');
const volumeBar = document.querySelector('.volume-bar');
const volumeLevel = document.getElementById('volume-level');
const volumeIcon = document.getElementById('volume-icon');
const playlist = document.getElementById('playlist');
const addMusicBtn = document.getElementById('add-music-btn');
const clearPlaylistBtn = document.getElementById('clear-playlist-btn');
const musicFileInput = document.getElementById('music-file-input');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const themeToggle = document.getElementById('theme-toggle');

// 播放器状态
let songs = [];
let currentSongIndex = 0;
let isPlaying = false;
let playMode = 'sequence'; // sequence, random, loop
let lastVolume = 0.8;
let searchHistory = [];
let searchResults = [];
let isSearching = false;

// 批量预加载所有歌曲时长
function preloadAllDurations() {
    let loadedCount = 0;
    const totalSongs = songs.filter(song => !song.duration && song.src).length;
    
    if (totalSongs === 0) return;
    
    songs.forEach((song, idx) => {
        if (!song.duration && song.src) {
            const tempAudio = document.createElement('audio');
            tempAudio.src = song.src;
            tempAudio.preload = 'metadata';
            
            const timeoutId = setTimeout(() => {
                console.warn(`获取歌曲 ${song.title} 时长超时`);
                tempAudio.removeEventListener('loadedmetadata', handler);
                tempAudio.removeEventListener('error', errorHandler);
                loadedCount++;
                if (loadedCount === totalSongs) {
                    updatePlaylist();
                }
            }, 5000); // 5秒超时
            
            function handler() {
                clearTimeout(timeoutId);
                song.duration = formatTime(tempAudio.duration);
                tempAudio.removeEventListener('loadedmetadata', handler);
                tempAudio.removeEventListener('error', errorHandler);
                loadedCount++;
                
                // 批量更新UI，避免频繁刷新
                if (loadedCount === totalSongs) {
                    updatePlaylist();
                }
            }
            
            function errorHandler() {
                clearTimeout(timeoutId);
                console.error(`无法加载歌曲 ${song.title} 的元数据`);
                tempAudio.removeEventListener('loadedmetadata', handler);
                tempAudio.removeEventListener('error', errorHandler);
                loadedCount++;
                if (loadedCount === totalSongs) {
                    updatePlaylist();
                }
            }
            
            tempAudio.addEventListener('loadedmetadata', handler);
            tempAudio.addEventListener('error', errorHandler);
        }
    });
}

// 初始化播放器
function initPlayer() {
    // 设置初始音量
    audioPlayer.volume = lastVolume;
    updateVolumeUI();

    // 加载预置音乐
    loadPresetSongs();

    // 加载搜索历史
    loadSearchHistory();

    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    // 检查本地存储中的播放列表
    const savedPlaylist = localStorage.getItem('playlist');
    if (savedPlaylist) {
        try {
            const parsedPlaylist = JSON.parse(savedPlaylist);
            if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
                songs = parsedPlaylist.filter(song => {
                    // 过滤掉无效的本地文件引用
                    if (song.isLocalFile && song.src && song.src.startsWith('blob:')) {
                        console.warn(`本地文件 ${song.fileName} 需要重新添加`);
                        return false;
                    }
                    return true;
                });
                
                if (songs.length > 0) {
                    updatePlaylist();
                    
                    // 恢复播放状态
                    const savedIndex = parseInt(localStorage.getItem('currentSongIndex') || '0');
                    const savedMode = localStorage.getItem('playMode') || 'sequence';
                    const savedVolume = parseFloat(localStorage.getItem('volume') || '0.8');
                    
                    currentSongIndex = Math.min(savedIndex, songs.length - 1);
                    playMode = savedMode;
                    audioPlayer.volume = savedVolume;
                    lastVolume = savedVolume;
                    
                    // 更新播放模式UI
                    updatePlayModeUI();
                    updateVolumeUI();
                    
                    loadSong(currentSongIndex);
                } else {
                    // 如果没有有效歌曲，加载预置歌曲
                    loadPresetSongs();
                }
            }
        } catch (e) {
            console.error('Failed to load saved playlist:', e);
            loadPresetSongs();
        }
    }
    // 优化：批量预加载所有歌曲时长
    preloadAllDurations();
}

// 加载预置音乐
function loadPresetSongs() {
    const presetSongs = [
        {
            title: 'Night Owl',
            artist: 'Broke For Free',
            src: 'assets/Broke_For_Free_-_01_-_Night_Owl.mp3',
            cover: 'assets/pexels-photo-1717969.jpeg'
        },
        {
            title: 'Shipping Lanes',
            artist: 'Chad Crouch',
            src: 'assets/Chad_Crouch_-_Shipping_Lanes.mp3',
            cover: 'assets/pexels-photo-2264753.jpeg'
        },
        {
            title: 'Enthusiast',
            artist: 'Tours',
            src: 'assets/Tours_-_01_-_Enthusiast.mp3',
            cover: 'assets/pexels-photo-3100835.jpeg'
        }
    ];

    // 如果播放列表为空，加载预置歌曲
    if (songs.length === 0) {
        songs = presetSongs;
        updatePlaylist();
        loadSong(0);
    }
}

// 更新播放列表 UI
function updatePlaylist() {
    playlist.innerHTML = '';
    
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="song-details">
                <div class="song-title">${song.title}</div>
                <div class="song-artist">${song.artist}</div>
            </div>
            <div class="song-duration">${song.duration || '0:00'}</div>
        `;
        
        if (index === currentSongIndex) {
            li.classList.add('active');
        }
        
        li.addEventListener('click', () => {
            currentSongIndex = index;
            loadSong(currentSongIndex);
            playSong();
        });
        
        playlist.appendChild(li);
    });

    // 保存播放列表到本地存储
    savePlaylist();
}

// 保存播放列表到本地存储
function savePlaylist() {
    try {
        // 创建一个可以安全序列化的播放列表副本
        const serializablePlaylist = songs.map(song => {
            // 排除不可序列化的属性，如 File 对象或 Blob URL
            const { file, ...rest } = song;
            // 标记本地文件以便恢复时识别
            if (song.file) {
                rest.isLocalFile = true;
                rest.fileName = song.file.name;
                rest.fileSize = song.file.size;
                rest.fileType = song.file.type;
            }
            return rest;
        });
        localStorage.setItem('playlist', JSON.stringify(serializablePlaylist));
        localStorage.setItem('currentSongIndex', currentSongIndex.toString());
        localStorage.setItem('playMode', playMode);
        localStorage.setItem('volume', audioPlayer.volume.toString());
    } catch (e) {
        console.error('Failed to save playlist:', e);
    }
}

// 加载歌曲
function loadSong(index) {
    if (songs.length === 0) return;
    
    currentSongIndex = index;
    const song = songs[currentSongIndex];
    
    // 更新音频源
    audioPlayer.src = song.src;
    
    // 更新界面
    songTitle.textContent = song.title;
    songArtist.textContent = song.artist;
    albumArt.src = song.cover || 'assets/pexels-photo-2264753.jpeg';
    
    // 重置进度条
    progress.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    
    // 高亮当前播放歌曲
    const playlistItems = playlist.querySelectorAll('li');
    playlistItems.forEach((item, i) => {
        if (i === currentSongIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // 预加载音频以获取时长
    audioPlayer.load();
}

// 播放歌曲
function playSong() {
    if (songs.length === 0) return;
    
    audioPlayer.play();
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i>';
}

// 暂停歌曲
function pauseSong() {
    audioPlayer.pause();
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i>';
}

// 播放上一首
function playPrevSong() {
    if (songs.length === 0) return;
    
    if (playMode === 'random') {
        playRandomSong();
    } else {
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        loadSong(currentSongIndex);
        playSong();
    }
}

// 播放下一首
function playNextSong() {
    if (songs.length === 0) return;
    
    if (playMode === 'random') {
        playRandomSong();
    } else {
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        loadSong(currentSongIndex);
        playSong();
    }
}

// 随机播放
function playRandomSong() {
    if (songs.length <= 1) return;
    
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * songs.length);
    } while (newIndex === currentSongIndex);
    
    currentSongIndex = newIndex;
    loadSong(currentSongIndex);
    playSong();
}

// 切换播放模式
function togglePlayMode() {
    if (playMode === 'sequence') {
        playMode = 'random';
    } else if (playMode === 'random') {
        playMode = 'loop';
    } else {
        playMode = 'sequence';
    }
    
    updatePlayModeUI();
    savePlaylist(); // 保存播放模式
}

// 更新播放模式UI
function updatePlayModeUI() {
    if (playMode === 'random') {
        playModeBtn.innerHTML = '<i class="fas fa-random"></i>';
        playModeBtn.title = '播放模式：随机播放';
    } else if (playMode === 'loop') {
        playModeBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
        playModeBtn.title = '播放模式：单曲循环';
    } else {
        playModeBtn.innerHTML = '<i class="fas fa-exchange-alt"></i>';
        playModeBtn.title = '播放模式：顺序播放';
    }
}

// 更新进度条
function updateProgress(e) {
    const { duration, currentTime } = e.target;
    if (duration) {
        // 更新进度条
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
        
        // 更新时间显示
        currentTimeEl.textContent = formatTime(currentTime);
        totalTimeEl.textContent = formatTime(duration);
        
        // 更新当前歌曲的时长信息
        if (!songs[currentSongIndex].duration) {
            songs[currentSongIndex].duration = formatTime(duration);
            updatePlaylist();
        }
    }
}

// 设置进度
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    
    if (duration) {
        audioPlayer.currentTime = (clickX / width) * duration;
    }
}

// 更新音量 UI
function updateVolumeUI() {
    volumeLevel.style.width = `${audioPlayer.volume * 100}%`;
    
    // 更新音量图标
    if (audioPlayer.volume === 0) {
        volumeIcon.className = 'fas fa-volume-mute';
    } else if (audioPlayer.volume < 0.5) {
        volumeIcon.className = 'fas fa-volume-down';
    } else {
        volumeIcon.className = 'fas fa-volume-up';
    }
}

// 设置音量
function setVolume(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const volume = clickX / width;
    
    // 限制音量范围在 0-1 之间
    audioPlayer.volume = Math.max(0, Math.min(1, volume));
    lastVolume = audioPlayer.volume;
    
    updateVolumeUI();
}

// 静音/取消静音
function toggleMute() {
    if (audioPlayer.volume === 0) {
        audioPlayer.volume = lastVolume;
    } else {
        lastVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
    }
    
    updateVolumeUI();
}

// 格式化时间
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// 添加本地音乐
function addLocalMusic() {
    musicFileInput.click();
}

// 处理文件选择
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;
    
    const addedSongs = [];
    
    Array.from(files).forEach(file => {
        if (file.type.startsWith('audio/')) {
            // 检查是否已存在相同文件
            const existingSong = songs.find(song => 
                song.fileName === file.name && song.fileSize === file.size
            );
            
            if (existingSong) {
                console.warn(`文件 ${file.name} 已存在于播放列表中`);
                return;
            }
            
            const fileURL = URL.createObjectURL(file);
            const fileName = file.name.replace(/\.[^/.]+$/, ''); // 移除扩展名
            
            // 智能解析文件名
            const { title, artist } = parseFileName(fileName);
            
            const song = {
                title,
                artist,
                src: fileURL,
                file, // 保存文件引用以便后续处理
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                isLocalFile: true,
                cover: 'assets/pexels-photo-3100835.jpeg' // 默认封面
            };
            
            songs.push(song);
            addedSongs.push(song);
        }
    });
    
    if (addedSongs.length > 0) {
        updatePlaylist();
        preloadAllDurations(); // 预加载新添加歌曲的时长
        
        if (!isPlaying) {
            loadSong(songs.length - 1); // 加载最新添加的歌曲
        }
        
        // 显示添加成功提示
        showNotification(`成功添加 ${addedSongs.length} 首歌曲`);
    }
    
    // 重置文件输入，允许重复选择相同文件
    musicFileInput.value = '';
}

// 智能解析文件名
function parseFileName(fileName) {
    let title = fileName;
    let artist = '未知歌手';
    
    // 常见的分隔模式：Artist - Title 或 Title - Artist
    const separators = [' - ', '-', '_', '–', ' – '];
    for (const separator of separators) {
        if (fileName.includes(separator)) {
            const parts = fileName.split(separator);
            if (parts.length >= 2) {
                // 假设第一部分是艺术家，第二部分是标题
                artist = parts[0].trim();
                title = parts.slice(1).join(separator).trim();
                break;
            }
        }
    }
    
    // 清理标题中的数字前缀（如 "01. Song Name"）
    title = title.replace(/^\d+\.?\s*/, '');
    
    return { title, artist };
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: var(--shadow);
        z-index: 1000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 清空播放列表
function clearPlaylist() {
    if (songs.length === 0) return;
    
    // 释放所有创建的对象 URL
    songs.forEach(song => {
        if (song.src && song.src.startsWith('blob:')) {
            URL.revokeObjectURL(song.src);
        }
    });
    
    songs = [];
    pauseSong();
    updatePlaylist();
    
    // 重置播放器状态
    audioPlayer.src = '';
    songTitle.textContent = '未播放';
    songArtist.textContent = '未知歌手';
    albumArt.src = 'assets/pexels-photo-2264753.jpeg';
    progress.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    totalTimeEl.textContent = '0:00';
}

// 模糊匹配算法
function fuzzyMatch(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // 完全匹配得分最高
    if (textLower.includes(queryLower)) {
        return 100;
    }
    
    // 计算编辑距离得分
    const distance = levenshteinDistance(textLower, queryLower);
    const maxLength = Math.max(text.length, query.length);
    const similarity = (maxLength - distance) / maxLength;
    
    return Math.floor(similarity * 100);
}

// 计算编辑距离
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// 高级搜索功能
function advancedSearch(query) {
    if (!query) return [];
    
    const results = [];
    
    songs.forEach((song, index) => {
        const titleScore = fuzzyMatch(song.title, query);
        const artistScore = fuzzyMatch(song.artist, query);
        const maxScore = Math.max(titleScore, artistScore);
        
        if (maxScore > 30) { // 相似度阈值
            results.push({
                song,
                index,
                score: maxScore,
                matchType: titleScore > artistScore ? 'title' : 'artist'
            });
        }
    });
    
    // 按相似度排序
    return results.sort((a, b) => b.score - a.score);
}

// 显示搜索结果
function displaySearchResults(results) {
    if (results.length === 0) {
        showSearchMessage('未找到匹配的歌曲');
        return;
    }
    
    // 清空当前播放列表显示
    playlist.innerHTML = '';
    
    // 添加搜索结果标题
    const header = document.createElement('li');
    header.innerHTML = `
        <div style="padding: 10px; background-color: var(--primary-color); color: white; font-weight: bold;">
            搜索结果 (${results.length}首)
            <button onclick="clearSearchResults()" style="float: right; background: rgba(255,255,255,0.2); border: none; color: white; padding: 2px 8px; border-radius: 3px; cursor: pointer;">清除</button>
        </div>
    `;
    playlist.appendChild(header);
    
    // 显示搜索结果
    results.forEach(result => {
        const li = document.createElement('li');
        const matchIndicator = result.matchType === 'title' ? '🎵' : '🎤';
        const scoreIndicator = '★'.repeat(Math.ceil(result.score / 25));
        
        li.innerHTML = `
            <div class="song-details">
                <div class="song-title">${matchIndicator} ${highlightMatch(result.song.title, searchInput.value)}</div>
                <div class="song-artist">${highlightMatch(result.song.artist, searchInput.value)}</div>
                <div style="font-size: 10px; color: var(--secondary-color);">${scoreIndicator} 匹配度: ${result.score}%</div>
            </div>
            <div class="song-duration">${result.song.duration || '0:00'}</div>
        `;
        
        li.addEventListener('click', () => {
            currentSongIndex = result.index;
            loadSong(currentSongIndex);
            playSong();
            clearSearchResults();
        });
        
        playlist.appendChild(li);
    });
}

// 高亮匹配文本
function highlightMatch(text, query) {
    if (!query) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark style="background-color: var(--primary-color); color: white; padding: 1px 2px; border-radius: 2px;">$1</mark>');
}

// 显示搜索消息
function showSearchMessage(message) {
    playlist.innerHTML = `
        <li style="text-align: center; padding: 20px; color: var(--secondary-color);">
            ${message}
            <br><br>
            <button onclick="clearSearchResults()" style="background: var(--primary-color); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">返回播放列表</button>
        </li>
    `;
}

// 清除搜索结果
function clearSearchResults() {
    searchResults = [];
    isSearching = false;
    searchInput.value = '';
    updatePlaylist();
}

// 将函数暴露到全局作用域
window.clearSearchResults = clearSearchResults;

// 保存搜索历史
function saveSearchHistory(query) {
    if (!query || searchHistory.includes(query)) return;
    
    searchHistory.unshift(query);
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

// 加载搜索历史
function loadSearchHistory() {
    const saved = localStorage.getItem('searchHistory');
    if (saved) {
        try {
            searchHistory = JSON.parse(saved);
        } catch (e) {
            searchHistory = [];
        }
    }
}

// 实时搜索建议
function showSearchSuggestions() {
    const query = searchInput.value.trim();
    
    if (!query) {
        hideSearchSuggestions();
        return;
    }
    
    const suggestions = [];
    
    // 添加搜索历史建议
    searchHistory.forEach(item => {
        if (item.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({ text: item, type: 'history' });
        }
    });
    
    // 添加歌曲建议
    songs.forEach(song => {
        if (song.title.toLowerCase().includes(query.toLowerCase()) || 
            song.artist.toLowerCase().includes(query.toLowerCase())) {
            suggestions.push({ 
                text: `${song.title} - ${song.artist}`, 
                type: 'song',
                song: song
            });
        }
    });
    
    displaySearchSuggestions(suggestions.slice(0, 8));
}

// 显示搜索建议
function displaySearchSuggestions(suggestions) {
    let suggestionsContainer = document.getElementById('search-suggestions');
    
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'search-suggestions';
        suggestionsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 0 0 8px 8px;
            box-shadow: var(--shadow);
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
        `;
        document.querySelector('.search-container').style.position = 'relative';
        document.querySelector('.search-container').appendChild(suggestionsContainer);
    }
    
    if (suggestions.length === 0) {
        hideSearchSuggestions();
        return;
    }
    
    suggestionsContainer.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item" style="
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 8px;
        " data-text="${suggestion.text}" data-type="${suggestion.type}">
            <i class="fas ${suggestion.type === 'history' ? 'fa-history' : 'fa-music'}" style="color: var(--secondary-color); font-size: 12px;"></i>
            <span>${highlightMatch(suggestion.text, searchInput.value)}</span>
        </div>
    `).join('');
    
    // 添加点击事件
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const text = item.dataset.text;
            searchInput.value = text;
            hideSearchSuggestions();
            searchSongs();
        });
        
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'var(--hover-color)';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = 'transparent';
        });
    });
}

// 隐藏搜索建议
function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
        suggestionsContainer.remove();
    }
}

// 搜索歌曲（优化版）
async function searchSongs() {
    const query = searchInput.value.trim();
    if (!query) {
        clearSearchResults();
        return;
    }
    
    isSearching = true;
    saveSearchHistory(query);
    hideSearchSuggestions();
    
    // 显示搜索中状态
    showSearchMessage('🔍 搜索中...');
    
    // 首先进行本地高级搜索
    const localResults = advancedSearch(query);
    
    if (localResults.length > 0) {
        searchResults = localResults;
        displaySearchResults(localResults);
        return;
    }
    
    // 如果本地没有结果，尝试从 Jamendo API 搜索
    try {
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=8&search=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            // 添加在线搜索结果到播放列表
            const newSongs = [];
            data.results.forEach(track => {
                const song = {
                    title: track.name,
                    artist: track.artist_name,
                    src: track.audio,
                    cover: track.image || 'assets/pexels-photo-1717969.jpeg',
                    isOnline: true
                };
                songs.push(song);
                newSongs.push({
                    song,
                    index: songs.length - 1,
                    score: 100,
                    matchType: 'online'
                });
            });
            
            searchResults = newSongs;
            displaySearchResults(newSongs);
            
            // 自动播放第一个结果
            currentSongIndex = newSongs[0].index;
            loadSong(currentSongIndex);
            playSong();
        } else {
            showSearchMessage('😔 未找到匹配的歌曲<br><small>尝试使用不同的关键词</small>');
        }
    } catch (error) {
        console.error('在线搜索失败:', error);
        showSearchMessage('🌐 在线搜索失败<br><small>请检查网络连接或尝试其他关键词</small>');
        
        // 降级处理：如果在线搜索失败，加载预置歌曲
        if (songs.length === 0) {
            loadPresetSongs();
        }
    }
}

// 切换主题
function toggleTheme() {
    if (document.body.getAttribute('data-theme') === 'dark') {
        document.body.removeAttribute('data-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    }
}

// 事件监听器
playBtn.addEventListener('click', () => {
    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
});

prevBtn.addEventListener('click', playPrevSong);
nextBtn.addEventListener('click', playNextSong);
playModeBtn.addEventListener('click', togglePlayMode);

audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('ended', () => {
    if (playMode === 'loop') {
        // 单曲循环
        audioPlayer.currentTime = 0;
        playSong();
    } else {
        // 顺序或随机播放下一首
        playNextSong();
    }
});

progressBar.addEventListener('click', setProgress);
volumeBar.addEventListener('click', setVolume);
volumeIcon.addEventListener('click', toggleMute);

addMusicBtn.addEventListener('click', addLocalMusic);
musicFileInput.addEventListener('change', handleFileSelect);
clearPlaylistBtn.addEventListener('click', clearPlaylist);

searchBtn.addEventListener('click', searchSongs);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchSongs();
    }
});

// 实时搜索建议
searchInput.addEventListener('input', showSearchSuggestions);
searchInput.addEventListener('focus', showSearchSuggestions);
searchInput.addEventListener('blur', () => {
    // 延迟隐藏，允许点击建议项
    setTimeout(hideSearchSuggestions, 200);
});

// 点击其他地方隐藏搜索建议
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        hideSearchSuggestions();
    }
});

themeToggle.addEventListener('click', toggleTheme);

// 初始化播放器
document.addEventListener('DOMContentLoaded', initPlayer);