// 音乐播放器主要功能实现 - 重构优化版

class MusicPlayer {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.bindEvents();
        this.initialize();
    }

    // 初始化DOM元素
    initializeElements() {
        this.elements = {
            audioPlayer: document.getElementById('audio-player'),
            playBtn: document.getElementById('play-btn'),
            mainPlayBtn: document.getElementById('main-play-btn'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            playModeBtn: document.getElementById('play-mode-btn'),
            // 移动端控制按钮
            mobilePlayBtn: document.getElementById('mobile-play-btn'),
            mobilePrevBtn: document.getElementById('mobile-prev-btn'),
            mobileNextBtn: document.getElementById('mobile-next-btn'),
            mobilePlayModeBtn: document.getElementById('mobile-play-mode-btn'),
            mobileVolumeIcon: document.getElementById('mobile-volume-icon'),
            mobileVolumeDownBtn: document.getElementById('mobile-volume-down-btn'),
            mobileVolumeUpBtn: document.getElementById('mobile-volume-up-btn'),
            albumArt: document.getElementById('album-art'),
            songTitle: document.getElementById('song-title'),
            songArtist: document.getElementById('song-artist'),
            currentTimeEl: document.getElementById('current-time'),
            totalTimeEl: document.getElementById('total-time'),
            progressBar: document.getElementById('progress-bar'),
            progress: document.getElementById('progress'),
            progressTooltip: document.getElementById('progress-tooltip'),
            progressContainer: document.querySelector('.progress-container'),
            volumeBar: document.getElementById('volume-bar'),
            volumeLevel: document.getElementById('volume-level'),
            volumeIcon: document.getElementById('volume-icon'),
            volumeText: document.getElementById('volume-text'),
            volumeDownBtn: document.getElementById('volume-down-btn'),
            volumeUpBtn: document.getElementById('volume-up-btn'),
            playlist: document.getElementById('playlist'),
            addMusicBtn: document.getElementById('add-music-btn'),
            clearPlaylistBtn: document.getElementById('clear-playlist-btn'),
            shuffleBtn: document.getElementById('shuffle-btn'),
            locateCurrentBtn: document.getElementById('locate-current-btn'),
            musicFileInput: document.getElementById('music-file-input'),
            searchInput: document.getElementById('search-input'),
            searchBtn: document.getElementById('search-btn'),
            clearSearchBtn: document.getElementById('clear-search-btn'),
            searchSuggestions: document.getElementById('search-suggestions'),
            themeToggle: document.getElementById('theme-toggle'),
            fullscreenBtn: document.getElementById('fullscreen-btn'),
            loadingIndicator: document.getElementById('loading-indicator'),
            playlistEmpty: document.getElementById('playlist-empty'),
            notificationContainer: document.getElementById('notification-container')
        };

        // 验证所有必需的元素是否存在
        this.validateElements();
    }

    // 验证DOM元素
    validateElements() {
        const requiredElements = [
            'audioPlayer', 'playBtn', 'mainPlayBtn', 'prevBtn', 'nextBtn',
            'albumArt', 'songTitle', 'songArtist', 'currentTimeEl', 'totalTimeEl',
            'progressBar', 'progress', 'progressTooltip', // Added
            'playlist', 'searchInput', 'searchSuggestions' // Added searchSuggestions
        ];
        const missing = requiredElements.filter(key => !this.elements[key]);
        if (missing.length > 0) {
            console.error('缺少必需的DOM元素:', missing);
            // this.showNotification(`初始化失败：缺少DOM元素 ${missing.join(', ')}`, 'error');
        }
    }

    // 初始化状态
    initializeState() {
        this.songs = [];
        this.currentSongIndex = 0;
        this.isPlaying = false;
        this.playMode = 'sequence'; // sequence, random, loop
        this.lastVolume = 0.8;
        this.searchHistory = [];
        this.searchResults = [];
        this.isSearching = false;
        this.isInitialized = false;
        this.progressUpdateInterval = null;
        this.notificationQueue = [];
        this.playModes = ['sequence', 'random', 'loop'];
        this.playModeIndex = 0;
        this.volumeStep = 0.1; // 新增：音量调节步长
        this.defaultCoverArt = 'assets/default-album-art.png'; // 默认专辑封面
        this.isDraggingProgress = false;
        this.wasPlayingBeforeDrag = false;
    }

    // 绑定事件监听器
    bindEvents() {
        // 播放控制
        this.safeAddEventListener(this.elements.playBtn, 'click', () => this.togglePlay());
        this.safeAddEventListener(this.elements.mainPlayBtn, 'click', () => this.togglePlay());
        this.safeAddEventListener(this.elements.prevBtn, 'click', () => this.playPrevSong());
        this.safeAddEventListener(this.elements.nextBtn, 'click', () => this.playNextSong());
        this.safeAddEventListener(this.elements.playModeBtn, 'click', () => this.togglePlayMode());

        // 移动端控制按钮事件绑定
        this.safeAddEventListener(this.elements.mobilePlayBtn, 'click', () => this.togglePlay());
        this.safeAddEventListener(this.elements.mobilePrevBtn, 'click', () => this.playPrevSong());
        this.safeAddEventListener(this.elements.mobileNextBtn, 'click', () => this.playNextSong());
        this.safeAddEventListener(this.elements.mobilePlayModeBtn, 'click', () => this.togglePlayMode());
        this.safeAddEventListener(this.elements.mobileVolumeIcon, 'click', () => this.toggleMute());
        this.safeAddEventListener(this.elements.mobileVolumeDownBtn, 'click', () => this.adjustVolume(-this.volumeStep));
        this.safeAddEventListener(this.elements.mobileVolumeUpBtn, 'click', () => this.adjustVolume(this.volumeStep));

        // 音频事件
        if (this.elements.audioPlayer) {
            this.elements.audioPlayer.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
            this.elements.audioPlayer.addEventListener('timeupdate', () => this.updateProgress());
            this.elements.audioPlayer.addEventListener('ended', () => this.onSongEnded());
            this.elements.audioPlayer.addEventListener('play', () => this.onPlay());
            this.elements.audioPlayer.addEventListener('pause', () => this.onPause());
            this.elements.audioPlayer.addEventListener('error', (e) => this.onAudioError(e));
            this.elements.audioPlayer.addEventListener('volumechange', () => this.updateVolumeUI());
        }

        // 进度条和音量控制
        this.safeAddEventListener(this.elements.progressBar, 'click', (e) => this.setProgress(e));
        this.safeAddEventListener(this.elements.progressBar, 'mousedown', (e) => this.startProgressDrag(e));
        this.safeAddEventListener(this.elements.progressContainer, 'mousemove', (e) => this.updateProgressTooltip(e));
        this.safeAddEventListener(this.elements.progressContainer, 'mouseleave', () => this.hideProgressTooltip());
        this.safeAddEventListener(this.elements.volumeBar, 'click', (e) => this.setVolume(e));
        this.safeAddEventListener(this.elements.volumeIcon, 'click', () => this.toggleMute());
        this.safeAddEventListener(this.elements.volumeDownBtn, 'click', () => this.adjustVolume(-this.volumeStep)); // 新增
        this.safeAddEventListener(this.elements.volumeUpBtn, 'click', () => this.adjustVolume(this.volumeStep));   // 新增

        // 播放列表管理
        this.safeAddEventListener(this.elements.addMusicBtn, 'click', () => this.addLocalMusic());
        this.safeAddEventListener(this.elements.clearPlaylistBtn, 'click', () => this.clearPlaylist());
        this.safeAddEventListener(this.elements.shuffleBtn, 'click', () => this.shufflePlaylist());
        this.safeAddEventListener(this.elements.locateCurrentBtn, 'click', () => this.locateCurrentSong()); // 新增
        this.safeAddEventListener(this.elements.musicFileInput, 'change', (e) => this.handleFileSelect(e));

        // 搜索功能
        this.safeAddEventListener(this.elements.searchBtn, 'click', () => this.searchSongs());
        this.safeAddEventListener(this.elements.clearSearchBtn, 'click', () => this.clearSearchResults());
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => this.handleSearchInput());
            this.elements.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchSongs();
                    if (this.elements.searchSuggestions) {
                        this.elements.searchSuggestions.style.display = 'none'; // Hide suggestions on enter
                    }
                }
            });
            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (this.elements.searchSuggestions && this.elements.searchInput) {
                    if (!this.elements.searchInput.contains(e.target) && !this.elements.searchSuggestions.contains(e.target)) {
                        this.elements.searchSuggestions.style.display = 'none';
                    }
                }
            });
        }

        // 主题和全屏
        this.safeAddEventListener(this.elements.themeToggle, 'click', () => this.toggleTheme());
        this.safeAddEventListener(this.elements.fullscreenBtn, 'click', () => this.toggleFullscreen());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // 页面卸载时清理
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    // 安全的事件监听器添加
    safeAddEventListener(element, event, handler) {
        if (element && typeof element.addEventListener === 'function') {
            element.addEventListener(event, handler);
        } else {
            console.warn(`元素不存在或不支持addEventListener:`, element);
        }
    }

    // 初始化播放器
    async initialize() {
        try {
            this.showLoading();

            // 设置初始音量
            if (this.elements.audioPlayer) {
                this.elements.audioPlayer.volume = this.lastVolume;
                this.updateVolumeUI();
            }

            // 加载设置和数据
            await this.loadSettings();
            await this.loadPresetSongs();
            
            // 初始化UI
            this.updatePlayModeUI();
            this.updatePlaylist();
            
            if (this.songs.length > 0) {
                this.loadSong(this.currentSongIndex);
            } else {
                this.showEmptyPlaylist();
            }

            this.isInitialized = true;
            this.hideLoading();
            
        } catch (error) {
            console.error('初始化播放器失败:', error);
            // this.showNotification('播放器初始化失败', 'error');
            this.hideLoading();
        }
    }

    // 显示/隐藏加载指示器
    showLoading() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'flex';
        }
    }

    hideLoading() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingIndicator.style.display = 'none';
            }, 500);
        }
    }

    // 加载设置
    async loadSettings() {
        try {
            // 主题设置
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'dark') {
                document.body.setAttribute('data-theme', 'dark');
                if (this.elements.themeToggle) {
                    this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                }
            }

            // 播放器设置
            const savedPlaylist = localStorage.getItem('playlist');
            if (savedPlaylist) {
                const parsedPlaylist = JSON.parse(savedPlaylist);
                if (Array.isArray(parsedPlaylist) && parsedPlaylist.length > 0) {
                    // 只恢复非本地（非blob:）音乐
                    this.songs = parsedPlaylist.filter(song => !song.isLocalFile && (!song.src || !song.src.startsWith('blob:')));

                    this.currentSongIndex = Math.min(
                        parseInt(localStorage.getItem('currentSongIndex') || '0'),
                        this.songs.length - 1
                    );
                    this.playMode = localStorage.getItem('playMode') || 'sequence';
                    this.lastVolume = parseFloat(localStorage.getItem('volume') || '0.8');
                    
                    if (this.elements.audioPlayer) {
                        this.elements.audioPlayer.volume = this.lastVolume;
                    }
                }
            }

            // 搜索历史
            const savedSearchHistory = localStorage.getItem('searchHistory');
            if (savedSearchHistory) {
                this.searchHistory = JSON.parse(savedSearchHistory);
            }
        } catch (e) {
            console.error('加载设置失败:', e);
        }
    }

    // 加载预置歌曲
    async loadPresetSongs() {
        if (this.songs.length > 0) return;

        this.songs = [
            {
                title: '致你',
                artist: '程响',
                src: 'assets/致你.mp3',
                cover: this.defaultCoverArt
            }
        ];
    }

    // 更新播放列表UI
    updatePlaylist() {
        if (!this.elements.playlist) return;

        if (this.songs.length === 0) {
            this.showEmptyPlaylist();
            return;
        }

        if (this.elements.playlistEmpty) {
            this.elements.playlistEmpty.style.display = 'none';
        }
        
        this.elements.playlist.innerHTML = '';

        const fragment = document.createDocumentFragment();
        
        this.songs.forEach((song, index) => {
            const li = document.createElement('li');
            // 只显示已知duration，否则显示空字符串
            let durationText = '';
            if (typeof song.duration === 'number' && !isNaN(song.duration)) {
                durationText = this.formatTime(song.duration);
            } else if (typeof song.duration === 'string' && song.duration.trim() !== '') {
                durationText = song.duration;
            }
            li.innerHTML = `
                <div class="song-details">
                    <div class="song-title">${this.escapeHtml(song.title)}</div>
                    <div class="song-artist">${this.escapeHtml(song.artist)}</div>
                </div>
                <div class="song-duration">${durationText}</div>
            `;
            
            if (index === this.currentSongIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => this.playSongAtIndex(index));
            fragment.appendChild(li);
        });

        this.elements.playlist.appendChild(fragment);
        this.savePlaylist();
    }

    // 显示空播放列表
    showEmptyPlaylist() {
        if (!this.elements.playlist || !this.elements.playlistEmpty) return;

        this.elements.playlist.innerHTML = '';
        this.elements.playlistEmpty.style.display = 'flex';
        
        // 绑定添加音乐按钮
        const addMusicPrompt = this.elements.playlistEmpty.querySelector('.add-music-prompt');
        if (addMusicPrompt) {
            addMusicPrompt.addEventListener('click', () => this.addLocalMusic());
        }
    }

    // 播放指定索引的歌曲
    async playSongAtIndex(index) {
        if (index < 0 || index >= this.songs.length) return;
        
        this.currentSongIndex = index;
        await this.loadSong(this.currentSongIndex);
        this.playSong();
    }

    // 加载歌曲
    async loadSong(index) {
        if (this.songs.length === 0 || index < 0 || index >= this.songs.length) return;
        this.currentSongIndex = index;
        const song = this.songs[this.currentSongIndex];
        try {
            if (this.elements.audioPlayer) {
                this.elements.audioPlayer.src = song.src;
                // 绑定 loadedmetadata 事件，确保能正确显示总时长
                this.elements.audioPlayer.onloadedmetadata = () => {
                    // 记录歌曲时长到song对象，避免重复加载
                    if (!song.duration || isNaN(song.duration)) {
                        song.duration = this.elements.audioPlayer.duration;
                        this.updatePlaylist();
                    }
                    this.updateProgress();
                };
            }
            if (this.elements.songTitle) {
                this.elements.songTitle.textContent = song.title;
            }
            if (this.elements.songArtist) {
                this.elements.songArtist.textContent = song.artist;
            }
            if (this.elements.albumArt) {
                this.elements.albumArt.src = song.cover || this.defaultCoverArt;
            }
            
            // 重置进度条
            if (this.elements.progress) {
                this.elements.progress.style.width = '0%';
            }
            if (this.elements.currentTimeEl) {
                this.elements.currentTimeEl.textContent = '0:00';
            }
            if (this.elements.totalTimeEl) {
                this.elements.totalTimeEl.textContent = '0:00';
            }
            
            // 更新播放列表高亮
            this.updatePlaylistHighlight();
            
            // 预加载音频
            if (this.elements.audioPlayer) {
                this.elements.audioPlayer.load();
            }
            
        } catch (error) {
            console.error('加载歌曲失败:', error);
        }
    }

    // 更新播放列表高亮
    updatePlaylistHighlight() {
        if (!this.elements.playlist) return;

        const playlistItems = this.elements.playlist.querySelectorAll('li');
        playlistItems.forEach((item, i) => {
            item.classList.toggle('active', i === this.currentSongIndex);
        });

        // 更新定位按钮状态
        this.updateLocateButtonState();
    }

    // 新增：更新定位按钮状态
    updateLocateButtonState() {
        if (!this.elements.locateCurrentBtn) return;

        // 如果在搜索状态或没有歌曲，禁用按钮
        const isDisabled = this.songs.length === 0;
        this.elements.locateCurrentBtn.disabled = isDisabled;
        
        // 根据搜索状态更新按钮样式和提示
        if (this.isSearching) {
            this.elements.locateCurrentBtn.title = '退出搜索并定位当前播放';
            this.elements.locateCurrentBtn.classList.add('search-mode');
        } else {
            this.elements.locateCurrentBtn.title = '定位当前播放';
            this.elements.locateCurrentBtn.classList.remove('search-mode');
        }
    }

    // 播放/暂停切换
    togglePlay() {
        if (this.songs.length === 0) {
            // this.showNotification('播放列表为空，请先添加音乐', 'info');
            return;
        }
        
        if (this.isPlaying) {
            this.pauseSong();
        } else {
            this.playSong();
        }
    }

    // 播放歌曲
    async playSong() {
        if (this.songs.length === 0 || !this.elements.audioPlayer) return;
        
        try {
            await this.elements.audioPlayer.play();
        } catch (error) {
            console.error('播放失败:', error);
            // this.showNotification('播放失败，请检查音频文件', 'error');
        }
    }

    // 暂停歌曲
    pauseSong() {
        if (this.elements.audioPlayer) {
            this.elements.audioPlayer.pause();
        }
    }

    // 上一首
    playPrevSong() {
        if (this.songs.length === 0) return;
        
        let prevIndex = this.currentSongIndex - 1;
        if (prevIndex < 0) {
            prevIndex = this.songs.length - 1;
        }
        
        this.playSongAtIndex(prevIndex);
    }

    // 下一首
    playNextSong() {
        if (this.songs.length === 0) return;
        
        let nextIndex;
        if (this.playMode === 'random') {
            nextIndex = Math.floor(Math.random() * this.songs.length);
        } else {
            nextIndex = this.currentSongIndex + 1;
            if (nextIndex >= this.songs.length) {
                nextIndex = 0;
            }
        }
        
        this.playSongAtIndex(nextIndex);
    }

    // 切换播放模式
    togglePlayMode() {
        this.playModeIndex = (this.playModeIndex + 1) % this.playModes.length;
        this.playMode = this.playModes[this.playModeIndex];
        this.updatePlayModeUI();
        localStorage.setItem('playMode', this.playMode);
    }

    // 更新播放模式UI
    updatePlayModeUI() {
        if (!this.elements.playModeBtn && !this.elements.mobilePlayModeBtn) return;

        const modeIcons = {
            sequence: 'fa-exchange-alt',
            random: 'fa-random',
            loop: 'fa-redo-alt'
        };
        
        const modeTexts = {
            sequence: '顺序播放',
            random: '随机播放',
            loop: '循环播放'
        };

        const iconHtml = `<i class="fas ${modeIcons[this.playMode]}"></i>`;
        const titleText = `播放模式：${modeTexts[this.playMode]}`;

        if (this.elements.playModeBtn) {
            this.elements.playModeBtn.innerHTML = iconHtml;
            this.elements.playModeBtn.title = titleText;
        }
        // 更新移动端播放模式按钮
        if (this.elements.mobilePlayModeBtn) {
            this.elements.mobilePlayModeBtn.innerHTML = iconHtml;
            this.elements.mobilePlayModeBtn.title = titleText;
        }
    }

    // 音频播放事件
    onPlay() {
        this.isPlaying = true;
        this.updatePlayButton(true);
        this.startProgressUpdate();
    }

    // 音频暂停事件
    onPause() {
        this.isPlaying = false;
        this.updatePlayButton(false);
        this.stopProgressUpdate();
    }

    // 歌曲结束事件
    onSongEnded() {
        if (this.playMode === 'loop') {
            this.playSong();
        } else {
            this.playNextSong();
        }
    }

    // 音频加载完成
    onLoadedMetadata() {
        this.updateProgress();
        // 确保总时长显示
        if (this.elements.audioPlayer && this.elements.totalTimeEl) {
            const duration = this.elements.audioPlayer.duration;
            if (!isNaN(duration)) {
                this.elements.totalTimeEl.textContent = this.formatTime(duration);
            }
        }
    }

    // 音频错误处理
    onAudioError(e) {
        console.error('音频播放错误:', e);
        // this.showNotification('音频播放错误', 'error');
        this.onPause();
    }

    // 更新播放按钮
    updatePlayButton(isPlaying) {
        const icon = isPlaying ? 'fa-pause' : 'fa-play';
        if (this.elements.playBtn) {
            this.elements.playBtn.innerHTML = `<i class="fas ${icon}"></i>`;
        }
        if (this.elements.mainPlayBtn) {
            this.elements.mainPlayBtn.innerHTML = `<i class="fas ${icon}"></i>`;
        }
        // 更新移动端播放按钮
        if (this.elements.mobilePlayBtn) {
            this.elements.mobilePlayBtn.innerHTML = `<i class="fas ${icon}"></i>`;
        }
    }

    // 开始进度更新
    startProgressUpdate() {
        this.stopProgressUpdate();
        this.progressUpdateInterval = setInterval(() => {
            this.updateProgress();
        }, 100);
    }

    // 停止进度更新
    stopProgressUpdate() {
        if (this.progressUpdateInterval) {
            clearInterval(this.progressUpdateInterval);
            this.progressUpdateInterval = null;
        }
    }

    // 更新进度条
    updateProgress() {
        if (!this.elements.audioPlayer || this.isDraggingProgress) return;

        const { duration, currentTime } = this.elements.audioPlayer;
        if (duration && !isNaN(duration)) {
            // 更新进度条
            const progressPercent = (currentTime / duration) * 100;
            if (this.elements.progress) {
                this.elements.progress.style.width = `${Math.max(0, Math.min(100, progressPercent))}%`;
            }
            
            // 更新时间显示
            if (this.elements.currentTimeEl) {
                this.elements.currentTimeEl.textContent = this.formatTime(currentTime);
            }
            if (this.elements.totalTimeEl) {
                this.elements.totalTimeEl.textContent = this.formatTime(duration);
            }
        } else {
            // 没有duration时的处理
            if (this.elements.progress) {
                this.elements.progress.style.width = '0%';
            }
            if (this.elements.currentTimeEl) {
                this.elements.currentTimeEl.textContent = this.formatTime(this.elements.audioPlayer.currentTime || 0);
            }
            if (this.elements.totalTimeEl) {
                this.elements.totalTimeEl.textContent = '0:00';
            }
        }
    }

    // 新增：更新进度条悬浮提示位置和内容
    updateProgressTooltip(e) {
        if (!this.elements.progressBar || !this.elements.progressTooltip || !this.elements.audioPlayer) return;

        const progressBarRect = this.elements.progressBar.getBoundingClientRect();
        const containerRect = this.elements.progressContainer.getBoundingClientRect();
        const hoverX = e.clientX - progressBarRect.left;
        const barWidth = progressBarRect.width;
        
        let hoverPercent = Math.max(0, Math.min(1, hoverX / barWidth));

        const duration = this.elements.audioPlayer.duration;
        if (duration && !isNaN(duration)) {
            const hoverTime = hoverPercent * duration;
            this.elements.progressTooltip.textContent = this.formatTime(hoverTime);
        } else {
            this.elements.progressTooltip.textContent = '0:00';
        }

        // 相对于进度容器定位
        const containerX = e.clientX - containerRect.left;
        const tooltipWidth = this.elements.progressTooltip.offsetWidth;
        let tooltipLeft = containerX;

        // 确保提示框不超出容器边界
        tooltipLeft = Math.max(tooltipWidth / 2, tooltipLeft);
        tooltipLeft = Math.min(containerRect.width - tooltipWidth / 2, tooltipLeft);
        
        this.elements.progressTooltip.style.left = `${tooltipLeft}px`;
    }

    // 新增：隐藏进度条提示
    hideProgressTooltip() {
        if (this.elements.progressTooltip) {
            this.elements.progressTooltip.style.opacity = '0';
            this.elements.progressTooltip.style.visibility = 'hidden';
        }
    }

    // 优化：设置进度
    setProgress(e) {
        if (!this.elements.progressBar || !this.elements.audioPlayer || this.isDraggingProgress) return;

        const rect = this.elements.progressBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const duration = this.elements.audioPlayer.duration;
        
        if (duration && !isNaN(duration) && width > 0) {
            const newTime = Math.max(0, Math.min(duration, (clickX / width) * duration));
            this.elements.audioPlayer.currentTime = newTime;
        }
    }

    // 新增：开始拖拽进度条
    startProgressDrag(e) {
        if (!this.elements.progressBar || !this.elements.audioPlayer) return;
        
        e.preventDefault();
        this.isDraggingProgress = true;
        this.wasPlayingBeforeDrag = this.isPlaying;
        
        // 暂停播放以避免冲突
        if (this.isPlaying) {
            this.pauseSong();
        }

        const onMouseMove = (e) => {
            if (!this.isDraggingProgress) return;
            this.setProgress(e);
        };

        const onMouseUp = () => {
            this.isDraggingProgress = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // 如果之前在播放，恢复播放
            if (this.wasPlayingBeforeDrag) {
                this.playSong();
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        // 立即设置一次进度
        this.setProgress(e);
    }

    // 更新音量UI
    updateVolumeUI() {
        if (!this.elements.audioPlayer) return;
        const volume = this.elements.audioPlayer.volume;
        if (this.elements.volumeLevel) {
            this.elements.volumeLevel.style.width = `${volume * 100}%`;
        }
        // 设置滑块位置
        const bar = this.elements.volumeBar;
        if (bar) {
            bar.style.setProperty('--volume-percent', (volume * 100).toFixed(1));
        }
        // 更新音量图标
        let iconClass = 'fa-volume-up';
        if (volume === 0) {
            iconClass = 'fa-volume-mute';
        } else if (volume < 0.5) {
            iconClass = 'fa-volume-down';
        }
        
        const iconHtml = `<i class="fas ${iconClass}"></i>`;
        if (this.elements.volumeIcon) {
            this.elements.volumeIcon.innerHTML = iconHtml;
        }
        // 更新移动端音量图标
        if (this.elements.mobileVolumeIcon) {
            this.elements.mobileVolumeIcon.innerHTML = iconHtml;
        }
        
        // 更新音量文本
        if (this.elements.volumeText) {
            this.elements.volumeText.textContent = `${Math.round(volume * 100)}%`;
        }
    }

    // 设置音量
    setVolume(e) {
        if (!this.elements.volumeBar || !this.elements.audioPlayer) return;
        const rect = this.elements.volumeBar.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const volume = Math.max(0, Math.min(1, clickX / width));
        this.elements.audioPlayer.volume = volume;
        
        if (volume > 0) { // 更新 lastVolume 只有在非静音时
            this.lastVolume = volume;
        }
        // updateVolumeUI 会自动由 volumechange 事件触发
        localStorage.setItem('volume', volume.toString());
    }

    // 静音/取消静音
    toggleMute() {
        if (!this.elements.audioPlayer) return;
        if (this.elements.audioPlayer.volume === 0) {
            this.elements.audioPlayer.volume = this.lastVolume || 0.8;
        } else {
            this.lastVolume = this.elements.audioPlayer.volume;
            this.elements.audioPlayer.volume = 0;
        }
        // updateVolumeUI 会自动由 volumechange 事件触发
    }

    // 新增：手动调节音量
    adjustVolume(delta) {
        if (!this.elements.audioPlayer) return;
        let newVolume = this.elements.audioPlayer.volume + delta;
        newVolume = Math.max(0, Math.min(1, newVolume)); // 限制在 0.0 到 1.0
        
        this.elements.audioPlayer.volume = newVolume;

        if (newVolume > 0) { // 如果调整后不是静音，则更新 lastVolume
            this.lastVolume = newVolume;
        }
        localStorage.setItem('volume', newVolume.toString());
        // UI 更新将由 'volumechange' 事件自动处理
    }

    // 格式化时间
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // 添加本地音乐
    addLocalMusic() {
        if (this.elements.musicFileInput) {
            this.elements.musicFileInput.click();
        }
    }

    // 处理文件选择
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length === 0) return;

        const addedSongs = [];
        Array.from(files).forEach(file => {
            if (file.type.startsWith('audio/')) {
                const exists = this.songs.some(song =>
                    song.isLocalFile &&
                    song.fileName === file.name &&
                    song.fileSize === file.size
                );
                if (exists) return;

                const fileURL = URL.createObjectURL(file);
                const fileName = file.name.replace(/\.[^/.]+$/, '');
                const { title, artist } = this.parseFileName(fileName);

                const song = {
                    title,
                    artist,
                    src: fileURL,
                    fileName: file.name,
                    fileSize: file.size,
                    isLocalFile: true,
                    cover: this.defaultCoverArt
                };

                this.songs.push(song);
                addedSongs.push(song);
            }
        });

        if (addedSongs.length > 0) {
            this.updatePlaylist();
            if (!this.isPlaying && this.songs.length === addedSongs.length) {
                this.loadSong(0);
            }
        }

        if (this.elements.musicFileInput) {
            this.elements.musicFileInput.value = '';
        }
    }

    // 智能解析文件名
    parseFileName(fileName) {
        let title = fileName;
        let artist = '未知歌手';
        
        const separators = [' - ', '-', '_', '–', ' – '];
        for (const separator of separators) {
            if (fileName.includes(separator)) {
                const parts = fileName.split(separator);
                if (parts.length >= 2) {
                    artist = parts[0].trim();
                    title = parts.slice(1).join(separator).trim();
                    break;
                }
            }
        }
        
        title = title.replace(/^\d+\.?\s*/, '');
        
        return { title, artist };
    }

    // 清空播放列表
    clearPlaylist() {
        if (confirm('确定要清空播放列表吗？')) {
            this.songs = [];
            this.currentSongIndex = 0;
            this.pauseSong();
            this.updatePlaylist();
            // this.showNotification('播放列表已清空');
        }
    }

    // 随机播放列表
    shufflePlaylist() {
        if (this.songs.length <= 1) return;
        
        const currentSong = this.songs[this.currentSongIndex];
        
        // Fisher-Yates 洗牌算法
        for (let i = this.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.songs[i], this.songs[j]] = [this.songs[j], this.songs[i]];
        }
        
        // 重新找到当前歌曲的位置
        this.currentSongIndex = this.songs.findIndex(song => song === currentSong);
        if (this.currentSongIndex === -1) this.currentSongIndex = 0;
        
        this.updatePlaylist();
        // this.showNotification('播放列表已随机排序');
    }

    // 搜索功能
    searchSongs() {
        const query = this.elements.searchInput?.value.trim();
        if (!query) {
            this.clearSearchResults();
            return;
        }
        
        this.isSearching = true;
        const results = this.songs.filter(song => 
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        );
        
        this.displaySearchResults(results, query);
    }

    // 显示搜索结果
    displaySearchResults(results, query) {
        if (!this.elements.playlist) return;

        if (this.elements.playlistEmpty) {
            this.elements.playlistEmpty.style.display = 'none';
        }

        this.elements.playlist.innerHTML = '';
        
        if (results.length === 0) {
            this.elements.playlist.innerHTML = `
                <li style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    未找到匹配 "${this.escapeHtml(query)}" 的歌曲
                </li>
            `;
            // 更新定位按钮状态
            this.updateLocateButtonState();
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        results.forEach((song) => {
            const originalIndex = this.songs.indexOf(song);
            const li = document.createElement('li');
            let durationText = '';
            if (typeof song.duration === 'number' && !isNaN(song.duration)) {
                durationText = this.formatTime(song.duration);
            } else if (typeof song.duration === 'string' && song.duration.trim() !== '') {
                durationText = song.duration;
            }
            li.innerHTML = `
                <div class="song-details">
                    <div class="song-title">${this.highlightMatch(song.title, query)}</div>
                    <div class="song-artist">${this.highlightMatch(song.artist, query)}</div>
                </div>
                <div class="song-duration">${durationText}</div>
            `;
            
            // 如果是当前播放的歌曲，添加active类
            if (originalIndex === this.currentSongIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', () => {
                this.playSongAtIndex(originalIndex);
                this.clearSearchResults();
            });
            
            fragment.appendChild(li);
        });

        this.elements.playlist.appendChild(fragment);
        
        // 更新定位按钮状态
        this.updateLocateButtonState();
    }

    // 高亮匹配文本
    highlightMatch(text, query) {
        if (!query) return this.escapeHtml(text);
        
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    // 转义正则表达式
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // 处理搜索输入
    handleSearchInput() {
        const query = this.elements.searchInput?.value.trim();
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = query ? 'block' : 'none';
        }

        if (!query) {
            if (this.elements.searchSuggestions) {
                this.elements.searchSuggestions.style.display = 'none';
                this.elements.searchSuggestions.innerHTML = '';
            }
            return;
        }

        // Filter songs for suggestions (simple local filter)
        const suggestions = this.songs.filter(song =>
            song.title.toLowerCase().includes(query.toLowerCase()) ||
            song.artist.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5); // Limit to 5 suggestions

        this.displaySearchSuggestions(suggestions, query);
    }

    // 新增：显示实时搜索建议
    displaySearchSuggestions(suggestions, query) {
        if (!this.elements.searchSuggestions) return;

        this.elements.searchSuggestions.innerHTML = '';
        if (suggestions.length === 0 && query) {
            this.elements.searchSuggestions.style.display = 'none';
            return;
        }

        const fragment = document.createDocumentFragment();
        suggestions.forEach(song => {
            const originalIndex = this.songs.indexOf(song);
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.innerHTML = `
                <span class="suggestion-title">${this.highlightMatch(song.title, query)}</span>
                <span class="suggestion-artist" style="font-size: 0.8em; color: var(--text-secondary); margin-left: 8px;">${this.highlightMatch(song.artist, query)}</span>
            `;
            item.addEventListener('click', () => {
                if (this.elements.searchInput) {
                    this.elements.searchInput.value = `${song.title} - ${song.artist}`;
                }
                this.playSongAtIndex(originalIndex);
                if (this.elements.searchSuggestions) {
                    this.elements.searchSuggestions.style.display = 'none';
                }
                if (this.elements.clearSearchBtn) {
                     this.elements.clearSearchBtn.style.display = 'block';
                }
            });
            fragment.appendChild(item);
        });

        this.elements.searchSuggestions.appendChild(fragment);
        this.elements.searchSuggestions.style.display = suggestions.length > 0 ? 'block' : 'none';
    }

    // 清除搜索结果
    clearSearchResults() {
        this.isSearching = false;
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = 'none';
        }
        if (this.elements.searchSuggestions) {
            this.elements.searchSuggestions.style.display = 'none';
        }
        this.updatePlaylist();
    }

    // 通知系统
    showNotification(message, type = 'info', duration = 3000) {
        // 已禁用弹窗提醒
    }

    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    // 键盘快捷键
    handleKeyboard(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.playPrevSong();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.playNextSong();
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
        }
    }

    // 切换全屏
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('无法进入全屏模式:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // 切换主题
    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            document.body.removeAttribute('data-theme');
            if (this.elements.themeToggle) {
                this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            }
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            if (this.elements.themeToggle) {
                this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
            localStorage.setItem('theme', 'dark');
        }
    }

    // 保存播放列表
    savePlaylist() {
        try {
            // 只保存非本地音乐（本地音乐刷新后不可用）
            const playlistData = this.songs.filter(song => !song.isLocalFile).map(song => ({
                ...song,
                src: song.src
            }));
            localStorage.setItem('playlist', JSON.stringify(playlistData));
            localStorage.setItem('currentSongIndex', this.currentSongIndex.toString());
            localStorage.setItem('playMode', this.playMode);
            localStorage.setItem('volume', (this.elements.audioPlayer?.volume || 0.8).toString());
        } catch (e) {
            console.error('保存播放列表失败:', e);
        }
    }

    // 清理资源
    cleanup() {
        this.stopProgressUpdate();
        
        // 释放对象URL
        this.songs.forEach(song => {
            if (song.src && song.src.startsWith('blob:')) {
                URL.revokeObjectURL(song.src);
            }
        });
        
        this.savePlaylist();
    }

    // 新增：定位到当前播放歌曲
    locateCurrentSong() {
        if (this.songs.length === 0 || this.isSearching) {
            // 如果正在搜索状态，先清除搜索结果
            if (this.isSearching) {
                this.clearSearchResults();
                // 给一点时间让DOM更新
                setTimeout(() => {
                    this.scrollToCurrentSong();
                }, 100);
            }
            return;
        }

        this.scrollToCurrentSong();
    }

    // 新增：滚动到当前歌曲位置
    scrollToCurrentSong() {
        if (!this.elements.playlist || this.songs.length === 0) return;

        const currentItem = this.elements.playlist.children[this.currentSongIndex];
        if (currentItem) {
            // 高亮效果
            currentItem.classList.add('locate-highlight');
            
            // 滚动到位置，确保歌曲在可视区域中央
            currentItem.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // 移除高亮效果
            setTimeout(() => {
                currentItem.classList.remove('locate-highlight');
            }, 2000);
        }
    }
}

// 初始化播放器
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});

// 全局函数
window.clearSearchResults = function() {
    if (window.musicPlayer) {
        window.musicPlayer.clearSearchResults();
    }
};