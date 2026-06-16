// Application State
let allUpdates = [];
let filteredUpdates = [];
let selectedUpdate = null;
let activeFilter = 'all';
let searchQuery = '';

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterContainer = document.getElementById('filter-container');
const feedSkeletons = document.getElementById('feed-skeletons');
const feedEmpty = document.getElementById('feed-empty');
const feedContent = document.getElementById('feed-content');
const resetSearchBtn = document.getElementById('reset-search-btn');
const lastSyncTimeEl = document.getElementById('last-sync-time');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statOthers = document.getElementById('stat-others');

// Composer Elements
const tweetComposer = document.getElementById('tweet-composer');
const composerHint = tweetComposer.querySelector('.composer-hint');
const composerBody = tweetComposer.querySelector('.composer-body');
const compSelectedType = document.getElementById('composer-selected-type');
const compSelectedDate = document.getElementById('composer-selected-date');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const tweetPreviewRender = document.getElementById('tweet-preview-render');
const tweetBtn = document.getElementById('tweet-btn');
const toastContainer = document.getElementById('toast-container');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    
    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        applyFiltersAndSearch();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndSearch();
    });

    resetSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        setActiveFilter('all');
        applyFiltersAndSearch();
    });

    // Filter pills
    filterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Remove active class from all pills
        filterContainer.querySelectorAll('.filter-pill').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Add active class to clicked pill
        pill.classList.add('active');
        activeFilter = pill.dataset.filter;
        
        applyFiltersAndSearch();
    });

    // Textarea character count and live preview
    tweetTextarea.addEventListener('input', (e) => {
        const text = e.target.value;
        updateCharCounter(text.length);
        tweetPreviewRender.textContent = text || "Type something to compose your tweet...";
    });

    // Tweet action button
    tweetBtn.addEventListener('click', () => {
        if (!selectedUpdate) return;
        const text = tweetTextarea.value;
        shareOnTwitter(text);
    });
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
    setLoadingState(true);
    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();
        
        if (data.status === 'success') {
            processReleaseNotes(data.entries);
            updateSyncTime();
            showToast('Release notes successfully synced!', 'success');
        } else {
            throw new Error(data.message || 'Failed to fetch release notes.');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        showToast(`Sync failed: ${error.message}`, 'error');
        setLoadingState(false);
    }
}

// Set Loading UI state
function setLoadingState(isLoading) {
    if (isLoading) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        feedSkeletons.style.display = 'block';
        feedContent.style.display = 'none';
        feedEmpty.style.display = 'none';
        document.querySelector('.pulse-indicator').classList.add('loading');
    } else {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
        feedSkeletons.style.display = 'none';
        document.querySelector('.pulse-indicator').classList.remove('loading');
    }
}

// Process entries from Atom Feed
function processReleaseNotes(entries) {
    allUpdates = [];
    
    entries.forEach(entry => {
        const parsed = parseEntryContent(entry.content, entry.date, entry.id);
        allUpdates.push(...parsed);
    });

    // Compute stats
    updateStatistics();
    
    // Apply filters
    applyFiltersAndSearch();
    
    setLoadingState(false);
}

// Parse daily HTML block into individual atomic updates
function parseEntryContent(contentHtml, entryDate, entryId) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${contentHtml}</div>`, 'text/html');
    const container = doc.body.firstChild;
    
    const updates = [];
    let currentType = 'General';
    let currentContent = [];
    
    // Helper to push gathered elements
    const pushCurrentUpdate = () => {
        if (currentContent.length > 0) {
            // Reconstruct HTML snippet
            const htmlString = currentContent.map(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    return node.outerHTML;
                }
                return node.textContent;
            }).join('');
            
            // Clean up text format for Twitter composer
            const textString = currentContent.map(node => node.textContent).join(' ').replace(/\s+/g, ' ').trim();
            
            updates.push({
                id: `${entryId}-${updates.length}`,
                date: entryDate,
                type: currentType,
                html: htmlString,
                text: textString
            });
            currentContent = [];
        }
    };

    // Iterate child nodes
    for (let i = 0; i < container.childNodes.length; i++) {
        const node = container.childNodes[i];
        
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H3') {
            pushCurrentUpdate();
            currentType = node.textContent.trim();
        } else {
            // Ignore leading blank space nodes
            if (currentContent.length === 0 && node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
                continue;
            }
            currentContent.push(node);
        }
    }
    
    // Push residual update
    pushCurrentUpdate();
    
    return updates;
}

// Update stats numbers in dashboard sidebar
function updateStatistics() {
    const counts = {
        total: allUpdates.length,
        features: 0,
        issues: 0,
        others: 0
    };

    allUpdates.forEach(up => {
        const type = up.type.toLowerCase();
        if (type === 'feature') counts.features++;
        else if (type === 'issue') counts.issues++;
        else counts.others++;
    });

    statTotal.textContent = counts.total;
    statFeatures.textContent = counts.features;
    statIssues.textContent = counts.issues;
    statOthers.textContent = counts.others;
}

// Sync time label updating
function updateSyncTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastSyncTimeEl.textContent = `Synced at ${timeStr}`;
}

// Set active filter pill explicitly
function setActiveFilter(filterVal) {
    activeFilter = filterVal;
    filterContainer.querySelectorAll('.filter-pill').forEach(btn => {
        if (btn.dataset.filter === filterVal) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Filters + Search combination
function applyFiltersAndSearch() {
    filteredUpdates = allUpdates.filter(up => {
        // 1. Type Filter matching
        if (activeFilter !== 'all') {
            if (up.type.toLowerCase() !== activeFilter) {
                return false;
            }
        }
        
        // 2. Search Text matching
        if (searchQuery) {
            const dateMatch = up.date.toLowerCase().includes(searchQuery);
            const typeMatch = up.type.toLowerCase().includes(searchQuery);
            const contentMatch = up.text.toLowerCase().includes(searchQuery);
            return dateMatch || typeMatch || contentMatch;
        }
        
        return true;
    });

    renderFeed();
}

// Group updates by date and render them to the view
function renderFeed() {
    feedContent.innerHTML = '';
    
    if (filteredUpdates.length === 0) {
        feedContent.style.display = 'none';
        feedEmpty.style.display = 'flex';
        return;
    }
    
    feedContent.style.display = 'block';
    feedEmpty.style.display = 'none';

    // Grouping by Date string
    const groups = {};
    filteredUpdates.forEach(up => {
        if (!groups[up.date]) {
            groups[up.date] = [];
        }
        groups[up.date].push(up);
    });

    // Generate HTML segments
    for (const date in groups) {
        const dayGroup = document.createElement('div');
        dayGroup.className = 'day-group';
        
        const dayHeader = document.createElement('h3');
        dayHeader.className = 'day-header';
        dayHeader.textContent = date;
        dayGroup.appendChild(dayHeader);
        
        groups[date].forEach(update => {
            const card = document.createElement('div');
            card.className = 'update-card';
            if (selectedUpdate && selectedUpdate.id === update.id) {
                card.classList.add('selected');
            }
            card.dataset.id = update.id;
            
            // Render Badge Type class
            const badgeClass = update.type.toLowerCase();
            
            card.innerHTML = `
                <div class="update-card-header">
                    <div class="badge-and-meta">
                        <span class="type-badge ${badgeClass}">${update.type}</span>
                        <span class="card-meta-date">${update.date}</span>
                    </div>
                    <div class="card-actions">
                        <button class="quick-share-btn" title="Quick Tweet" aria-label="Quick tweet about this release note">
                            <svg class="icon-x-mini" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="update-card-content">
                    ${update.html}
                </div>
            `;
            
            // Card select listener
            card.addEventListener('click', (e) => {
                // Avoid triggers when clicking the quick share button itself
                if (e.target.closest('.quick-share-btn')) {
                    const defaultText = composeDefaultTweet(update);
                    shareOnTwitter(defaultText);
                    return;
                }
                
                selectUpdateCard(update);
            });
            
            dayGroup.appendChild(card);
        });
        
        feedContent.appendChild(dayGroup);
    }
}

// Select a card and load it into composer
function selectUpdateCard(update) {
    selectedUpdate = update;
    
    // Toggle active visual indicator classes
    document.querySelectorAll('.update-card').forEach(card => {
        if (card.dataset.id === update.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    // Open/Animate composer
    composerHint.style.display = 'none';
    composerBody.style.display = 'flex';
    
    // Set type styling class on badge
    compSelectedType.className = `selected-badge ${update.type.toLowerCase()}`;
    compSelectedType.textContent = update.type;
    compSelectedDate.textContent = update.date;
    
    // Compose default message
    const defaultTweetText = composeDefaultTweet(update);
    tweetTextarea.value = defaultTweetText;
    
    // Update live previews
    updateCharCounter(defaultTweetText.length);
    tweetPreviewRender.textContent = defaultTweetText;
    
    // Scroll into view on mobile viewport
    if (window.innerWidth <= 1024) {
        tweetComposer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Tweet helper composer
function composeDefaultTweet(update) {
    const typeLabel = update.type.toUpperCase();
    const prefix = `BigQuery ${typeLabel} (${update.date}): `;
    const suffix = ` #BigQuery #GoogleCloud`;
    
    // 280 character limit
    const availableLength = 280 - prefix.length - suffix.length;
    
    let snippet = update.text;
    if (snippet.length > availableLength) {
        snippet = snippet.substring(0, availableLength - 3) + '...';
    }
    
    return `${prefix}${snippet}${suffix}`;
}

// Character limit classes
function updateCharCounter(length) {
    charCount.textContent = length;
    
    if (length > 280) {
        charCount.className = 'char-counter danger';
        tweetBtn.disabled = true;
    } else if (length > 250) {
        charCount.className = 'char-counter warning';
        tweetBtn.disabled = false;
    } else {
        charCount.className = 'char-counter';
        tweetBtn.disabled = false;
    }
}

// External Twitter/X Intent opening
function shareOnTwitter(tweetText) {
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
}

// Toast Alert System
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-feature)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
    } else {
        icon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-issue)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>`;
    }
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Trigger slide animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 4000);
}
