class TimezoneConverter {
    constructor() {
        this.DEFAULT_TIMEZONES = [
            'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
            'Asia/Dubai', 'Asia/Hong_Kong'
        ];
        
        this.displayedTimezones = new Set();
        this.timezoneOrder = [];
        this.customTime = null;
        this.pendingCustomDate = null;
        this.pendingCustomTime = null;
        this.updateInterval = null;
        this.sortable = null;
        this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        this.init();
    }
    
    init() {
        console.log('🚀 Initializing TimeZone Pro...');
        
        this.loadSettings();
        this.setupNavigation();
        this.populateTimezoneSelects();
        this.setupEventListeners();
        this.loadTimezones();
        this.initializeSortable();
        this.startAutoUpdate();
        this.updateUI();
        this.updateLocationTimezoneDisplay();
        
        console.log('✅ TimeZone Pro initialized successfully');
    }
    
    // FIXED: Bulletproof navigation setup
    setupNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navPanel = document.getElementById('navPanel');
        
        if (!navToggle || !navPanel) {
            console.error('❌ Navigation elements not found');
            return;
        }
        
        console.log('🔧 Setting up navigation...');
        
        // Default to expanded - only collapse if explicitly saved as collapsed
        const savedCollapsed = localStorage.getItem('navCollapsed');
        if (savedCollapsed === 'true') {
            navPanel.classList.add('collapsed');
            navToggle.setAttribute('aria-expanded', 'false');
            console.log('📱 Navigation restored to collapsed state');
        } else {
            navPanel.classList.remove('collapsed');
            navToggle.setAttribute('aria-expanded', 'true');
            console.log('📖 Navigation set to expanded state (default)');
        }
        
        // Add click handler
        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const isCollapsed = navPanel.classList.toggle('collapsed');
            navToggle.setAttribute('aria-expanded', (!isCollapsed).toString());
            localStorage.setItem('navCollapsed', isCollapsed.toString());
            
            console.log('🔄 Navigation toggled to:', isCollapsed ? 'collapsed' : 'expanded');
        });
        
        // Keyboard support
        navToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navToggle.click();
            }
        });
        
        console.log('✅ Navigation setup complete');
    }
    
    saveAsDefault() {
        const currentState = {
            displayedTimezones: Array.from(this.displayedTimezones),
            timezoneOrder: this.timezoneOrder,
            navigationExpanded: !document.getElementById('navPanel').classList.contains('collapsed')
        };
        
        localStorage.setItem('userDefaultSettings', JSON.stringify(currentState));
        this.showToast('Current setup saved as your default');
        console.log('💾 User default settings saved');
    }
    
    resetToDefaults() {
        const userDefaults = localStorage.getItem('userDefaultSettings');
        
        let confirmMessage = 'Reset to ';
        if (userDefaults) {
            confirmMessage += 'your saved default settings?';
        } else {
            confirmMessage += 'app defaults? (This will clear all custom timezones and settings)';
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }
        
        console.log('🔄 Resetting to defaults...');
        
        if (userDefaults) {
            try {
                const defaults = JSON.parse(userDefaults);
                
                localStorage.removeItem('timezoneProSettings');
                
                this.displayedTimezones = new Set(defaults.displayedTimezones || this.DEFAULT_TIMEZONES);
                this.timezoneOrder = defaults.timezoneOrder || Array.from(this.displayedTimezones);
                this.customTime = null;
                this.pendingCustomDate = null;
                this.pendingCustomTime = null;
                
                const navPanel = document.getElementById('navPanel');
                if (navPanel) {
                    if (defaults.navigationExpanded !== false) {
                        navPanel.classList.remove('collapsed');
                        localStorage.setItem('navCollapsed', 'false');
                    } else {
                        navPanel.classList.add('collapsed');
                        localStorage.setItem('navCollapsed', 'true');
                    }
                }
                
                this.showToast('Reset to your saved defaults');
                console.log('✅ Reset to user defaults complete');
            } catch (error) {
                console.error('Error loading user defaults:', error);
                this.resetToAppDefaults();
            }
        } else {
            this.resetToAppDefaults();
        }
        
        this.clearForms();
        this.loadTimezones();
        this.updateUI();
        this.updateLocationTimezoneDisplay();
    }
    
    resetToAppDefaults() {
        localStorage.removeItem('timezoneProSettings');
        localStorage.removeItem('userDefaultSettings');
        
        this.displayedTimezones = new Set(this.DEFAULT_TIMEZONES);
        this.timezoneOrder = [...this.DEFAULT_TIMEZONES];
        this.customTime = null;
        this.pendingCustomDate = null;
        this.pendingCustomTime = null;
        
        const navPanel = document.getElementById('navPanel');
        if (navPanel) {
            navPanel.classList.remove('collapsed');
            localStorage.setItem('navCollapsed', 'false');
        }
        
        this.showToast('Reset to app defaults');
        console.log('✅ Reset to app defaults complete');
    }
    
    clearForms() {
        const customDate = document.getElementById('customDate');
        const customTimeOnly = document.getElementById('customTimeOnly');
        const addSelect = document.getElementById('addTimezoneSelect');
        
        if (customDate) customDate.value = '';
        if (customTimeOnly) customTimeOnly.value = '';
        if (addSelect) addSelect.value = '';
    }
    
    updateLocationTimezoneDisplay() {
        const tzDisplay = document.getElementById('sourceTimezoneDisplay');
        if (!tzDisplay) return;
        
        try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en', {
                timeZone: this.userTimezone,
                timeZoneName: 'longOffset'
            });
            const parts = formatter.formatToParts(now);
            const offset = parts.find(part => part.type === 'timeZoneName')?.value || 'UTC+0';
            
            const cityName = this.formatTimezoneName(this.userTimezone, true);
            tzDisplay.textContent = `${cityName} | ${offset}`;
        } catch (error) {
            console.error('Error updating location timezone display:', error);
            tzDisplay.textContent = 'Unknown Location';
        }
    }
    
    updateCurrentTimeDisplay() {
        const baseTime = this.customTime || new Date();
        
        try {
            const timeInTimezone = new Date(baseTime.toLocaleString('en-US', { timeZone: this.userTimezone }));
            
            const timeString = timeInTimezone.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateString = timeInTimezone.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            
            const timezoneLabel = this.formatTimezoneName(this.userTimezone, true);
            
            const timeDisplay = document.getElementById('currentTimeDisplay');
            const dateDisplay = document.getElementById('currentDateDisplay');
            const timezoneDisplay = document.getElementById('currentTimezoneLabel');
            const currentTimeLabel = document.getElementById('currentTimeLabel');
            
            if (timeDisplay) timeDisplay.textContent = timeString;
            if (dateDisplay) dateDisplay.textContent = dateString;
            if (timezoneDisplay) timezoneDisplay.textContent = timezoneLabel;
            
            if (currentTimeLabel) {
                currentTimeLabel.textContent = this.customTime ? 'Custom Time Set' : 'Your Current Time';
            }
            
        } catch (error) {
            console.error('Error updating current time display:', error);
        }
    }
    
    updateUI() {
        const customTimeStatus = document.getElementById('customTimeStatus');
        const resetBtn = document.getElementById('resetTime');
        const customTimeLabel = document.getElementById('customTimeLabel');
        const saveBtn = document.getElementById('saveCustomTime');
        
        const hasPendingDateTime = this.pendingCustomDate || this.pendingCustomTime;
        
        if (this.customTime) {
            if (customTimeStatus) customTimeStatus.style.display = 'flex';
            if (resetBtn) {
                resetBtn.classList.add('resume-mode');
                resetBtn.innerHTML = '<i class="fas fa-play"></i><span>Resume Live Time</span>';
            }
            if (customTimeLabel) customTimeLabel.textContent = 'Custom Time Active';
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            if (customTimeStatus) customTimeStatus.style.display = 'none';
            if (resetBtn) {
                resetBtn.classList.remove('resume-mode');
                resetBtn.innerHTML = '<i class="fas fa-clock"></i><span>Convert Custom Time</span>';
            }
            if (customTimeLabel) customTimeLabel.textContent = 'Convert Custom Time';
            if (saveBtn) saveBtn.style.display = hasPendingDateTime ? 'flex' : 'none';
        }
    }
    
    getTimezoneOffsetHours(timezone) {
        try {
            const now = new Date();
            const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            const local = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            const offsetMs = local.getTime() - utc.getTime();
            return offsetMs / (1000 * 60 * 60);
        } catch (error) {
            return 0;
        }
    }
    
    getUTCOffsetString(timezone) {
        try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en', {
                timeZone: timezone,
                timeZoneName: 'longOffset'
            });
            const parts = formatter.formatToParts(now);
            return parts.find(part => part.type === 'timeZoneName')?.value || 'UTC+0';
        } catch (error) {
            return 'UTC+0';
        }
    }
    
    saveSettings() {
        const settings = {
            displayedTimezones: Array.from(this.displayedTimezones),
            timezoneOrder: this.timezoneOrder,
            customTime: this.customTime ? this.customTime.toISOString() : null
        };
        localStorage.setItem('timezoneProSettings', JSON.stringify(settings));
    }
    
    loadSettings() {
        const savedSettings = localStorage.getItem('timezoneProSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                this.displayedTimezones = new Set(settings.displayedTimezones || this.DEFAULT_TIMEZONES);
                this.timezoneOrder = settings.timezoneOrder || Array.from(this.displayedTimezones);
                this.customTime = settings.customTime ? new Date(settings.customTime) : null;
                
                setTimeout(() => {
                    this.populateCustomDateTime();
                    this.updateUI();
                }, 100);
            } catch (error) {
                console.error('Error loading settings:', error);
                this.resetToDefaultsInternal();
            }
        } else {
            this.resetToDefaultsInternal();
        }
    }
    
    resetToDefaultsInternal() {
        this.displayedTimezones = new Set(this.DEFAULT_TIMEZONES);
        this.timezoneOrder = [...this.DEFAULT_TIMEZONES];
    }
    
    populateCustomDateTime() {
        const customDate = document.getElementById('customDate');
        const customTimeOnly = document.getElementById('customTimeOnly');
        
        if (this.customTime && customDate && customTimeOnly) {
            const dateStr = this.customTime.toISOString().split('T')[0];
            const timeStr = this.customTime.toTimeString().split(' ')[0].slice(0, 5);
            
            customDate.value = dateStr;
            customTimeOnly.value = timeStr;
        }
    }
    
    populateTimezoneSelects() {
        const timezones = Intl.supportedValuesOf('timeZone');
        const addSelect = document.getElementById('addTimezoneSelect');
        
        if (addSelect) {
            const timezoneData = timezones.map(tz => ({
                timezone: tz,
                offset: this.getTimezoneOffsetHours(tz),
                offsetString: this.getUTCOffsetString(tz),
                name: this.formatTimezoneName(tz)
            }));
            
            timezoneData.sort((a, b) => a.offset - b.offset);
            
            addSelect.innerHTML = '<option value="">Choose timezone to add...</option>';
            timezoneData.forEach(({ timezone, offsetString, name }) => {
                const option = document.createElement('option');
                option.value = timezone;
                option.textContent = `${offsetString} | ${name}`;
                addSelect.appendChild(option);
            });
            
            console.log('📋 Timezone dropdown populated with', timezoneData.length, 'options');
        }
    }
    
    formatTimezoneName(timezone, short = false) {
        const parts = timezone.split('/');
        const city = parts[parts.length - 1].replace(/_/g, ' ');
        const region = parts[0].replace(/_/g, ' ');
        
        if (short) {
            return city;
        }
        return `${city} (${region})`;
    }
    
    setupEventListeners() {
        const customDate = document.getElementById('customDate');
        const customTimeOnly = document.getElementById('customTimeOnly');
        const saveBtn = document.getElementById('saveCustomTime');
        const resetBtn = document.getElementById('resetTime');
        const addSelect = document.getElementById('addTimezoneSelect');
        const exportCSV = document.getElementById('exportCSV');
        const copyFormatted = document.getElementById('copyFormatted');
        const resetToDefaultsBtn = document.getElementById('resetToDefaults');
        const saveAsDefaultBtn = document.getElementById('saveAsDefault');
        
        if (customDate) {
            customDate.addEventListener('change', (e) => {
                this.pendingCustomDate = e.target.value;
                this.updateUI();
            });
        }
        
        if (customTimeOnly) {
            customTimeOnly.addEventListener('change', (e) => {
                this.pendingCustomTime = e.target.value;
                this.updateUI();
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCustomDateTime();
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.customTime) {
                    this.customTime = null;
                    this.pendingCustomDate = null;
                    this.pendingCustomTime = null;
                    if (customDate) customDate.value = '';
                    if (customTimeOnly) customTimeOnly.value = '';
                } else {
                    const now = new Date();
                    this.customTime = now;
                    this.pendingCustomDate = null;
                    this.pendingCustomTime = null;
                    this.populateCustomDateTime();
                }
                this.updateAllTimezones();
                this.updateCurrentTimeDisplay();
                this.updateUI();
                this.saveSettings();
            });
        }
        
        if (addSelect) {
            addSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.addTimezone(e.target.value);
                    e.target.value = '';
                }
            });
        }
        
        if (exportCSV) {
            exportCSV.addEventListener('click', () => {
                this.exportToCSV();
            });
        }
        
        if (copyFormatted) {
            copyFormatted.addEventListener('click', () => {
                this.copyFormattedText();
            });
        }
        
        if (resetToDefaultsBtn) {
            resetToDefaultsBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }
        
        if (saveAsDefaultBtn) {
            saveAsDefaultBtn.addEventListener('click', () => {
                this.saveAsDefault();
            });
        }
        
        console.log('🔗 All event listeners bound successfully');
    }
    
    saveCustomDateTime() {
        const customDate = document.getElementById('customDate');
        const customTimeOnly = document.getElementById('customTimeOnly');
        
        if (this.pendingCustomDate || this.pendingCustomTime) {
            const dateValue = this.pendingCustomDate || (customDate ? customDate.value : '') || new Date().toISOString().split('T')[0];
            const timeValue = this.pendingCustomTime || (customTimeOnly ? customTimeOnly.value : '') || '00:00';
            
            try {
                this.customTime = new Date(`${dateValue}T${timeValue}:00`);
                this.pendingCustomDate = null;
                this.pendingCustomTime = null;
                
                this.updateAllTimezones();
                this.updateCurrentTimeDisplay();
                this.updateUI();
                this.saveSettings();
                
                this.showToast('Custom time applied');
            } catch (error) {
                console.error('Error creating custom date/time:', error);
                this.showToast('Invalid date/time format');
            }
        }
    }
    
    loadTimezones() {
        const grid = document.getElementById('timezoneGrid');
        if (grid) {
            grid.innerHTML = '';
        }
        
        this.timezoneOrder.forEach(timezone => {
            if (this.displayedTimezones.has(timezone)) {
                this.createAndAddTimezoneCard(timezone);
            }
        });
        
        this.displayedTimezones.forEach(timezone => {
            if (!this.timezoneOrder.includes(timezone)) {
                this.createAndAddTimezoneCard(timezone);
                this.timezoneOrder.push(timezone);
            }
        });
        
        console.log('🗺️ Loaded', this.displayedTimezones.size, 'timezone cards');
    }
    
    initializeSortable() {
        const grid = document.getElementById('timezoneGrid');
        if (grid && typeof Sortable !== 'undefined') {
            this.sortable = new Sortable(grid, {
                animation: 200,
                ghostClass: 'sortable-placeholder',
                dragClass: 'sortable-drag',
                onEnd: () => {
                    this.updateTimezoneOrder();
                    this.saveSettings();
                }
            });
            console.log('🎯 Sortable drag-and-drop initialized');
        }
    }
    
    updateTimezoneOrder() {
        const cards = document.querySelectorAll('.timezone-card');
        this.timezoneOrder = Array.from(cards).map(card => card.dataset.timezone);
        this.saveSettings();
    }
    
    addTimezone(timezone) {
        if (this.displayedTimezones.has(timezone)) {
            this.showToast('Timezone already added');
            return;
        }
        
        this.displayedTimezones.add(timezone);
        this.timezoneOrder.push(timezone);
        this.createAndAddTimezoneCard(timezone);
        this.saveSettings();
        this.showToast('Timezone added');
    }
    
    createAndAddTimezoneCard(timezone) {
        const card = this.createTimezoneCard(timezone);
        const grid = document.getElementById('timezoneGrid');
        if (grid) {
            grid.appendChild(card);
            this.updateTimezoneCard(timezone);
        }
    }
    
    createTimezoneCard(timezone) {
        const card = document.createElement('div');
        card.className = 'timezone-card fade-in';
        card.dataset.timezone = timezone;
        
        const safeId = timezone.replace(/[^a-zA-Z0-9]/g, '_');
        
        card.innerHTML = `
            <div class="timezone-header">
                <div class="timezone-name">${this.formatTimezoneName(timezone)}</div>
                <div class="card-actions">
                    <button class="drag-handle" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </button>
                    <button class="remove-btn" onclick="timezoneConverter.removeTimezone('${timezone}')" title="Remove timezone">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="current-time" id="time-${safeId}">--:--</div>
            <div class="current-date" id="date-${safeId}">Loading...</div>
            <div class="timezone-info">
                <span id="offset-${safeId}">UTC+0</span>
                <span id="dst-${safeId}" class="dst-indicator" style="display: none;">DST</span>
            </div>
        `;
        
        return card;
    }
    
    removeTimezone(timezone) {
        const card = document.querySelector(`[data-timezone="${timezone}"]`);
        if (card) {
            card.remove();
            this.displayedTimezones.delete(timezone);
            this.timezoneOrder = this.timezoneOrder.filter(tz => tz !== timezone);
            this.saveSettings();
            this.showToast('Timezone removed');
        }
    }
    
    getCurrentTime() {
        return this.customTime || new Date();
    }
    
    getTimezoneOffset(timezone, date) {
        const utc1 = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const utc2 = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
        return utc2.getTime() - utc1.getTime();
    }
    
    updateTimezoneCard(timezone) {
        const safeId = timezone.replace(/[^a-zA-Z0-9]/g, '_');
        const currentTime = this.getCurrentTime();
        
        try {
            const timeInTimezone = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
            
            const timeString = timeInTimezone.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const dateString = timeInTimezone.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            const formatter = new Intl.DateTimeFormat('en', {
                timeZone: timezone,
                timeZoneName: 'longOffset'
            });
            const offsetMatch = formatter.formatToParts(currentTime)
                .find(part => part.type === 'timeZoneName');
            const offset = offsetMatch ? offsetMatch.value : 'UTC+0';
            
            const isDST = this.isDaylightSavingTime(timezone, currentTime);
            
            const timeElement = document.getElementById(`time-${safeId}`);
            const dateElement = document.getElementById(`date-${safeId}`);
            const offsetElement = document.getElementById(`offset-${safeId}`);
            const dstElement = document.getElementById(`dst-${safeId}`);
            
            if (timeElement) timeElement.textContent = timeString;
            if (dateElement) dateElement.textContent = dateString;
            if (offsetElement) offsetElement.textContent = offset;
            if (dstElement) {
                dstElement.style.display = isDST ? 'inline' : 'none';
            }
            
        } catch (error) {
            console.error(`Error updating timezone ${timezone}:`, error);
        }
    }
    
    isDaylightSavingTime(timezone, date) {
        const january = new Date(date.getFullYear(), 0, 1);
        const july = new Date(date.getFullYear(), 6, 1);
        
        const janOffset = this.getTimezoneOffset(timezone, january);
        const julOffset = this.getTimezoneOffset(timezone, july);
        const currentOffset = this.getTimezoneOffset(timezone, date);
        
        const isNorthernHemisphere = janOffset < julOffset;
        
        if (isNorthernHemisphere) {
            return currentOffset === julOffset && julOffset > janOffset;
        } else {
            return currentOffset === janOffset && janOffset > julOffset;
        }
    }
    
    updateAllTimezones() {
        this.displayedTimezones.forEach(timezone => {
            this.updateTimezoneCard(timezone);
        });
    }
    
    // Export Functions
    exportToCSV() {
        const data = this.generateTimezoneData();
        const csv = this.convertToCSV(data);
        this.downloadFile('timezones.csv', csv, 'text/csv');
        this.showToast('CSV exported successfully');
    }
    
    copyFormattedText() {
        const data = this.generateTimezoneData();
        const formatted = this.formatForSharing(data);
        
        navigator.clipboard.writeText(formatted).then(() => {
            this.showToast('Copied to clipboard');
        }).catch(() => {
            this.showToast('Copy failed');
        });
    }
    
    generateTimezoneData() {
        const currentTime = this.getCurrentTime();
        const data = [];
        
        this.timezoneOrder.forEach(timezone => {
            if (this.displayedTimezones.has(timezone)) {
                try {
                    const timeInZone = new Date(currentTime.toLocaleString('en-US', { timeZone: timezone }));
                    const time = timeInZone.toLocaleTimeString('en-US', {
                        hour12: false, hour: '2-digit', minute: '2-digit'
                    });
                    const date = timeInZone.toLocaleDateString('en-US');
                    const offset = this.getUTCOffsetString(timezone);
                    const isDST = this.isDaylightSavingTime(timezone, currentTime);
                    
                    data.push({
                        timezone: this.formatTimezoneName(timezone),
                        time,
                        date,
                        offset,
                        dst: isDST ? 'Yes' : 'No'
                    });
                } catch (error) {
                    console.error(`Error processing ${timezone}:`, error);
                }
            }
        });
        
        return data;
    }
    
    convertToCSV(data) {
        const headers = ['Timezone', 'Time', 'Date', 'UTC Offset', 'DST'];
        const rows = data.map(row => [
            row.timezone, row.time, row.date, row.offset, row.dst
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
        
        return csvContent;
    }
    
    formatForSharing(data) {
        const currentTime = this.customTime ? 
            `Custom Time: ${this.customTime.toLocaleString()}` : 
            `Current Time: ${new Date().toLocaleString()}`;
        
        let formatted = `🌍 TimeZone Pro - Global Times\n${currentTime}\n\n`;
        
        data.forEach(({ timezone, time, offset, dst }) => {
            const dstIndicator = dst === 'Yes' ? ' (DST)' : '';
            formatted += `${timezone}\n${time} ${offset}${dstIndicator}\n\n`;
        });
        
        formatted += 'Generated by TimeZone Pro';
        return formatted;
    }
    
    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    showToast(message) {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastMessage) return;
        
        toastMessage.textContent = message;
        toast.style.display = 'flex';
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.style.display = 'none';
            }, 250);
        }, 3000);
    }
    
    startAutoUpdate() {
        this.updateInterval = setInterval(() => {
            if (!this.customTime) {
                this.updateAllTimezones();
                this.updateCurrentTimeDisplay();
            }
        }, 1000);
        console.log('⏰ Auto-update started');
    }
    
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            console.log('⏰ Auto-update stopped');
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.timezoneConverter = new TimezoneConverter();
    } catch (error) {
        console.error('❌ Failed to initialize TimeZone Pro:', error);
    }
});

document.addEventListener('visibilitychange', () => {
    if (window.timezoneConverter) {
        if (document.hidden) {
            window.timezoneConverter.stopAutoUpdate();
        } else {
            window.timezoneConverter.startAutoUpdate();
        }
    }
});
