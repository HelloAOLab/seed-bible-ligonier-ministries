// SgSearch.jsx
const { useEffect, useState, useMemo, useRef } = os.appHooks;
const getStyleOf = await thisBot.GetStyle();

function SgCard({ item, isOpen, onToggle, viewMode = "list", fullContent, loadingContent, contentError, isNowPlaying, setNowPlayingId, onClose, isPinned }) {
    // Debug flag for video tracking
    const DEBUG_VIDEO_TRACKING = false; // Set to true to enable logs
    
    // preview animation height + iframe remount on tab switching
    const [previewH, setPreviewH] = useState(0);
    const previewRef = useMemo(() => ({ el: null }), []);
    
    // Media and transcript state
    const mediaRef = useRef(null);
    const youtubePlayerRef = useRef(null);
    const transcriptContainerRef = useRef(null);
    const transcriptScrollRef = useRef(null);
    const [visibleSentences, setVisibleSentences] = useState([]);
    const [activeSentenceIndex, setActiveSentenceIndex] = useState(-1);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const [transcriptSearchQuery, setTranscriptSearchQuery] = useState("");
    const [showTranscriptContainer, setShowTranscriptContainer] = useState(false);
    const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(true); // Default to expanded
    const updateTranscriptRef = useRef(null); // Ref to store latest updateTranscriptVisibility
    const isNowPlayingRef = useRef(isNowPlaying); // Ref to track current isNowPlaying state
    
    // Search Navigation State
    const [searchMatches, setSearchMatches] = useState([]); // Array of sentence indices
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
    
    // Video error state for dead link handling
    const [videoError, setVideoError] = useState(false);
    const [audioError, setAudioError] = useState(false);

    // Extract YouTube ID helper
    const getYouTubeId = (url) => {
        if (!url) return null;
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        return match ? match[1] : null;
    };
    
    // Helper to extract source domain from content
    const getSourceDomain = () => {
        // For YouTube, always show "YouTube"
        if (fullContent?.VideoUrl?.includes('youtube.com') || fullContent?.VideoUrl?.includes('youtu.be')) {
            return 'YouTube';
        }
        // Extract domain from SourceUrl
        const sourceUrl = fullContent?.SourceUrl || item?.SourceUrl;
        if (sourceUrl) {
            try {
                const url = new URL(sourceUrl);
                return url.hostname.replace(/^www\./, '');
            } catch (e) { }
        }
        return 'Ligonier Ministries';
    };

    // Helper to extract a highlight snippet from API response
    // Prefers transcript highlights for "why this matched"
    const getHighlightSnippet = () => {
        const highlights = item?.highlights;
        if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
            return null;
        }
        
        // Prefer RawTranscript highlights, fall back to any other
        const transcriptHighlight = highlights.find(h => h.path === 'RawTranscript') || highlights[0];
        if (!transcriptHighlight?.texts) return null;
        
        // Build snippet from texts array, capping at ~150 chars
        let snippet = '';
        for (const part of transcriptHighlight.texts) {
            if (snippet.length > 150) break;
            snippet += part.value || '';
        }
        
        // Clean up and truncate
        snippet = snippet.trim().replace(/\s+/g, ' ');
        if (snippet.length > 150) {
            snippet = snippet.substring(0, 147) + '...';
        }
        
        return snippet;
    };

    // Exclusive Media Playback Logic
    const dispatchPlayEvent = () => {
        const event = new CustomEvent('sg-media-play', { 
            detail: { id: item._id } 
        });
        window.dispatchEvent(event);
        // Notify parent that this card is now playing
        if (setNowPlayingId) {
            setNowPlayingId(item._id);
        }
    };

    // Note: We do NOT clear nowPlayingId on pause - only on:
    // 1. Clicking the close button
    // 2. Media ending
    // 3. Playing a different card (which sets a new ID)

    const handleMediaEnded = () => {
        // Clear now playing when this card's media ends
        if (setNowPlayingId && isNowPlaying) {
            setNowPlayingId(null);
        }
    };

    useEffect(() => {
        const handleMediaPlay = (e) => {
            // If another card is playing (different ID), pause our media
            if (e.detail?.id && e.detail.id !== item._id) {
                // Pause HTML5 Media
                if (mediaRef.current) {
                    // Check if it's actually playing before trying to pause to avoid errors
                    if (!mediaRef.current.paused) {
                        mediaRef.current.pause();
                    }
                }
                
                // Pause YouTube
                if (youtubePlayerRef.current?.pauseVideo) {
                    // Get state: 1 = playing, 3 = buffering
                    const state = youtubePlayerRef.current.getPlayerState();
                    if (state === 1 || state === 3) {
                        youtubePlayerRef.current.pauseVideo();
                    }
                }
            }
        };

        window.addEventListener('sg-media-play', handleMediaPlay);
        return () => window.removeEventListener('sg-media-play', handleMediaPlay);
    }, [item._id]);

    // Media detection
    const hasVideo = fullContent?.VideoUrl;
    const hasAudio = fullContent?._StorageId && fullContent?.mimeType?.startsWith('audio/');
    // Exclusive media logic: Video takes precedence over Audio. PDF is ignored for now as per user request.
    const showVideo = !!hasVideo;
    const showAudio = !hasVideo && !!hasAudio;
    
    const audioUrl = hasAudio ? fullContent._StorageId : null;
    const sentences = Array.isArray(fullContent?.Sentences) ? fullContent.Sentences : [];
    
    // Date formatting helper
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toDateString();
        } catch {
            return dateString;
        }
    };
    
    // Description - format as "Community: Ligonier Ministries" + date
    // Only rely on CreatedOn fields provided by the API
    const dateField = fullContent?._CreatedOn || 
                      item?._CreatedOn ||
                      null;
    
    const formattedDate = dateField ? formatDate(dateField) : '';
    const communityLabel = 'Community: Ligonier Ministries';
    
    // Check if video is YouTube
    const isYouTube = hasVideo && /youtube\.com|youtu\.be/.test(fullContent.VideoUrl);
    
    // Filter out non-media cards if content is loaded
    if (!loadingContent && !contentError && !hasVideo && !hasAudio) {
        return null;
    }

    // Search Logic
    useEffect(() => {
        if (
            !showTranscriptContainer ||
            visibleSentences.length === 0 ||
            !transcriptSearchQuery.trim()
        ) {
            setSearchMatches([]);
            setCurrentMatchIndex(-1);
            return;
        }
        
        const query = transcriptSearchQuery.toLowerCase();
        const matches = [];
        
        visibleSentences.forEach((sentence) => {
            if (!sentence?.text) return;
            const originalIdx = sentences.findIndex(s => s === sentence);
            if (originalIdx === -1) return;
            if (sentence.text.toLowerCase().includes(query)) {
                matches.push(originalIdx);
            }
        });
        
        setSearchMatches(matches);
        if (matches.length > 0) {
            setCurrentMatchIndex(0);
        } else {
            setCurrentMatchIndex(-1);
        }
    }, [showTranscriptContainer, visibleSentences, sentences, transcriptSearchQuery]);

    // Scroll to match when currentMatchIndex changes
    useEffect(() => {
        if (currentMatchIndex >= 0 && searchMatches.length > 0 && transcriptScrollRef.current) {
            const sentenceIdx = searchMatches[currentMatchIndex];
            // Find the element via data attribute
            setTimeout(() => {
                const el = transcriptScrollRef.current.querySelector(`[data-sentence-index="${sentenceIdx}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [currentMatchIndex, searchMatches]);

    const handleNextMatch = () => {
        if (searchMatches.length === 0) return;
        setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length);
    };

    const handlePrevMatch = () => {
        if (searchMatches.length === 0) return;
        setCurrentMatchIndex(prev => (prev - 1 + searchMatches.length) % searchMatches.length);
    };

    useEffect(() => {
        if (previewRef.el) {
            const h = previewRef.el.scrollHeight || 0;
            setPreviewH(h > 8 ? h : 8);
        }
    }, [isOpen, hasVideo, hasAudio, sentences.length, isTranscriptExpanded]);

    // Helper function to check if user is at bottom of transcript container
    const isAtBottom = () => {
        if (!transcriptScrollRef.current) return false;
        const container = transcriptScrollRef.current;
        const threshold = 50; // pixels from bottom
        return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    };
    
    // Scroll to bottom handler
    const scrollToBottom = () => {
        if (transcriptScrollRef.current) {
            transcriptScrollRef.current.scrollTo({
                top: transcriptScrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };
    
    // Track scroll position to show/hide scroll-to-bottom button
    useEffect(() => {
        if (sentences.length === 0 || !transcriptScrollRef.current) {
            setShowScrollToBottom(false);
            return;
        }
        
        const container = transcriptScrollRef.current;
        
        const handleScroll = () => {
            const threshold = 50; // pixels from bottom
            const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            const isAtBottom = scrollBottom < threshold;
            setShowScrollToBottom(!isAtBottom);
        };
        
        container.addEventListener('scroll', handleScroll);
        handleScroll();
        
        const checkInterval = setInterval(() => {
            handleScroll();
        }, 150);
        
        const observer = new MutationObserver(() => {
            setTimeout(handleScroll, 50);
        });
        
        observer.observe(container, {
            childList: true,
            subtree: true
        });
        
        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearInterval(checkInterval);
            observer.disconnect();
        };
    }, [hasAudio, hasVideo, visibleSentences.length]);
    
    // Helper function to update transcript visibility
    const updateTranscriptVisibility = (time) => {
        // Only proceed if this card is in Now Playing
        if (!isNowPlayingRef.current) return;
        
        const visible = sentences.filter(s => s.start !== undefined && s.start <= time);
        
        const wasAtBottom = isAtBottom();
        
        if (visible.length > 0 && !showTranscriptContainer) {
            setShowTranscriptContainer(true);
        }
        
        // Always update visible sentences - React's reconciliation will optimize if unchanged
        setVisibleSentences(visible);
        
        let activeIdx = -1;
        for (let i = 0; i < sentences.length; i++) {
            const s = sentences[i];
            const nextS = sentences[i + 1];
            if (s.start !== undefined && s.start <= time && (!nextS || nextS.start === undefined || nextS.start > time)) {
                activeIdx = i;
                break;
            }
        }
        
        // Always update active index
        setActiveSentenceIndex(activeIdx);
        
        // Auto-scroll if user is at bottom
        if (wasAtBottom && activeIdx >= 0 && transcriptScrollRef.current) {
            setTimeout(() => {
                const container = transcriptScrollRef.current;
                if (!container) return;
                
                // Double-check user is still at bottom before scrolling
                const threshold = 50;
                const stillAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
                
                if (stillAtBottom) {
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100);
        }
    };

    // Keep refs updated with latest values to avoid stale closures
    updateTranscriptRef.current = updateTranscriptVisibility;
    isNowPlayingRef.current = isNowPlaying;

    // Initialize YouTube iframe API
    useEffect(() => {
        if (!isYouTube || !isOpen) return;
        
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        
        const checkYT = setInterval(() => {
            if (window.YT && window.YT.Player) {
                clearInterval(checkYT);
                const match = fullContent.VideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                if (match) {
                    const iframeId = `youtube-player-${item._id}`;
                    setTimeout(() => {
                        const iframe = document.getElementById(iframeId);
                        if (iframe && !youtubePlayerRef.current) {
                            if (DEBUG_VIDEO_TRACKING) {
                                console.log('[YouTube] Creating player for:', iframeId);
                            }
                            youtubePlayerRef.current = new window.YT.Player(iframeId, {
                                events: {
                                    onReady: () => {
                                        if (DEBUG_VIDEO_TRACKING) {
                                            console.log('[YouTube] Player ready for:', iframeId);
                                            console.log('[YouTube] Player methods available:', {
                                                getCurrentTime: typeof youtubePlayerRef.current?.getCurrentTime === 'function',
                                                getPlayerState: typeof youtubePlayerRef.current?.getPlayerState === 'function',
                                                seekTo: typeof youtubePlayerRef.current?.seekTo === 'function'
                                            });
                                        }
                                    },
                                    onStateChange: (event) => {
                                        const stateMap = {
                                            '-1': 'unstarted',
                                            '0': 'ended',
                                            '1': 'playing',
                                            '2': 'paused',
                                            '3': 'buffering',
                                            '5': 'cued'
                                        };
                                        
                                        if (DEBUG_VIDEO_TRACKING) {
                                            console.log('[YouTube] State changed:', event.data, stateMap[event.data] || 'unknown');
                                        }
                                        
                                        // Set up time tracking when video starts playing
                                        if (event.data === 1) { // Playing
                                            dispatchPlayEvent(); // Notify other cards to pause

                                            if (DEBUG_VIDEO_TRACKING) {
                                                console.log('[YouTube] Video playing - starting time tracking');
                                            }
                                            
                                            // Cancel any existing tracking
                                            if (youtubePlayerRef.current?._trackingIntervalId) {
                                                clearInterval(youtubePlayerRef.current._trackingIntervalId);
                                            }
                                            
                                            // Use setInterval for throttled updates (every 500ms to reduce energy)
                                            const trackTime = () => {
                                                const player = youtubePlayerRef.current;
                                                if (!player) {
                                                    // No player - stop interval
                                                    if (youtubePlayerRef.current?._trackingIntervalId) {
                                                        clearInterval(youtubePlayerRef.current._trackingIntervalId);
                                                        youtubePlayerRef.current._trackingIntervalId = null;
                                                    }
                                                    return;
                                                }
                                                
                                                // Stop tracking if this card is no longer in Now Playing
                                                if (!isNowPlayingRef.current) {
                                                    if (player._trackingIntervalId) {
                                                        clearInterval(player._trackingIntervalId);
                                                        player._trackingIntervalId = null;
                                                    }
                                                    return;
                                                }
                                                
                                                try {
                                                    const playerState = player.getPlayerState();
                                                    const currentTime = player.getCurrentTime();
                                                    
                                                    // ONLY update transcript if PLAYING (state === 1)
                                                    // For ANY other state, stop the interval completely
                                                    if (playerState !== 1) {
                                                        if (player._trackingIntervalId) {
                                                            clearInterval(player._trackingIntervalId);
                                                            player._trackingIntervalId = null;
                                                        }
                                                        return;
                                                    }
                                                    
                                                    // Video is playing - update transcript
                                                    if (
                                                        currentTime !== undefined &&
                                                        typeof currentTime === 'number' &&
                                                        !isNaN(currentTime) &&
                                                        currentTime >= 0 &&
                                                        updateTranscriptRef.current
                                                    ) {
                                                        updateTranscriptRef.current(currentTime);
                                                    }
                                                } catch (err) {
                                                    // Error - stop interval
                                                    if (player._trackingIntervalId) {
                                                        clearInterval(player._trackingIntervalId);
                                                        player._trackingIntervalId = null;
                                                    }
                                                }
                                            };
                                            
                                            // Start tracking with setInterval (500ms)
                                            try {
                                                youtubePlayerRef.current._trackingIntervalId =
                                                    setInterval(trackTime, 500);
                                            } catch (err) {
                                                // Silently ignore errors
                                            }
                                        } else if (event.data === 2 || event.data === 0) { // Paused or Ended
                                            // Cancel tracking when paused or ended
                                            if (youtubePlayerRef.current?._trackingIntervalId) {
                                                clearInterval(youtubePlayerRef.current._trackingIntervalId);
                                                youtubePlayerRef.current._trackingIntervalId = null;
                                            }
                                            
                                            // Update transcript one last time with current position when paused
                                            if (event.data === 2 && youtubePlayerRef.current) {
                                                try {
                                                    const currentTime = youtubePlayerRef.current.getCurrentTime();
                                                    if (currentTime !== undefined && typeof currentTime === 'number' && !isNaN(currentTime) && currentTime >= 0) {
                                                        if (updateTranscriptRef.current) {
                                                            updateTranscriptRef.current(currentTime);
                                                        }
                                                    }
                                                } catch (err) {
                                                    // Ignore errors on final update
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }, 500);
                }
            }
        }, 100);
        
        return () => {
            clearInterval(checkYT);
            if (youtubePlayerRef.current) {
                // Cancel any active interval tracking
                if (youtubePlayerRef.current._trackingIntervalId) {
                    clearInterval(youtubePlayerRef.current._trackingIntervalId);
                    youtubePlayerRef.current._trackingIntervalId = null;
                }
                youtubePlayerRef.current.destroy();
                youtubePlayerRef.current = null;
            }
            // Reset transcript visibility when player is destroyed
            setVisibleSentences([]);
            setShowTranscriptContainer(false);
            setActiveSentenceIndex(-1);
        };
    }, [isYouTube, isOpen, fullContent?.VideoUrl, item._id, isNowPlaying]);


    // Time tracking for transcript synchronization - Audio AND Video
    useEffect(() => {
        if (DEBUG_VIDEO_TRACKING) {
            console.log('[Time Tracking] useEffect triggered:', {
                sentencesLength: sentences.length,
                isOpen,
                hasAudio,
                hasVideo,
                isYouTube
            });
        }
        
        if (sentences.length === 0 || !isOpen) {
            if (DEBUG_VIDEO_TRACKING) {
                console.log('[Time Tracking] Early return:', {
                    reason: sentences.length === 0 ? 'no sentences' : 'card not open'
                });
            }
            return;
        }
        
        // Audio time tracking
        if (hasAudio) {
            const setupAudioTracking = () => {
                const element = mediaRef.current;
                if (!element || element.tagName !== 'AUDIO' || element.getAttribute('data-audio-player') !== 'true') {
                    return null;
                }
                
                const audio = element;
                
                const handleTimeUpdate = () => {
                    if (audio && audio.tagName === 'AUDIO' && audio.getAttribute('data-audio-player') === 'true' && hasAudio) {
                        const time = audio.currentTime;
                        // Use ref to get latest function
                        if (updateTranscriptRef.current) {
                            updateTranscriptRef.current(time);
                        }
                    }
                };
                const handleSeeked = () => {
                    if (audio && audio.tagName === 'AUDIO' && audio.getAttribute('data-audio-player') === 'true' && hasAudio) {
                        // Use ref to get latest function
                        if (updateTranscriptRef.current) {
                            updateTranscriptRef.current(audio.currentTime);
                        }
                    }
                };
                
                audio.addEventListener('timeupdate', handleTimeUpdate);
                audio.addEventListener('seeked', handleSeeked);
                return () => {
                    audio.removeEventListener('timeupdate', handleTimeUpdate);
                    audio.removeEventListener('seeked', handleSeeked);
                };
            };
            
            let cleanup = setupAudioTracking();
            if (cleanup) return cleanup;
            
            const timeout = setTimeout(() => {
                cleanup = setupAudioTracking();
            }, 200);
            
            return () => {
                clearTimeout(timeout);
                if (cleanup) cleanup();
            };
        }
    }, [hasAudio, sentences.length, isOpen, isNowPlaying]);

    // Reset transcript visibility when card closes or media changes
    useEffect(() => {
        if (!isOpen) {
            setVisibleSentences([]);
            setShowTranscriptContainer(false);
            setActiveSentenceIndex(-1);
        }
    }, [isOpen]);

    // Reset transcript when media content changes
    useEffect(() => {
        setVisibleSentences([]);
        setShowTranscriptContainer(false);
        setActiveSentenceIndex(-1);
    }, [fullContent?.VideoUrl, fullContent?.AudioUrl, item._id]);

    // Click handler for transcript sentences
    const handleSentenceClick = (sentence) => {
        if (sentence.start === undefined) return;
        
        // Handle audio seeking
        if (hasAudio) {
            const audio = mediaRef.current;
            if (audio && audio.tagName === 'AUDIO' && audio.getAttribute('data-audio-player') === 'true') {
                audio.currentTime = sentence.start;
                audio.play();
                return;
            }
        }
        
        // Handle video seeking (YouTube)
        if (hasVideo && sentence.start !== undefined) {
            if (isYouTube && youtubePlayerRef.current) {
                try {
                    youtubePlayerRef.current.seekTo(sentence.start, true);
                } catch (e) {
                    console.warn('Failed to seek YouTube video:', e);
                }
            }
        }
    };
    
    // Convert video URL to embed URL
    const getVideoEmbedUrl = (url) => {
        if (!url) return null;
        const urlIsYouTube = /youtube\.com|youtu\.be/.test(url);
        
        if (urlIsYouTube) {
            const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
            if (match) return `https://www.youtube.com/embed/${match[1]}?enablejsapi=1`;
        }
        return null;
    };
    
    // Render video player
    const renderVideo = () => {
        if (!showVideo) return null;
        
        // Show error state if video failed to load
        if (videoError) {
            return (
                <div className="sg-media-unavailable">
                    <span className="material-symbols-outlined">videocam_off</span>
                    <span>Video unavailable</span>
                </div>
            );
        }
        
        const embedUrl = getVideoEmbedUrl(fullContent.VideoUrl);
        
        if (embedUrl) {
            const iframeId = `youtube-player-${item._id}`;
            return (
                <div className="sg-previewVideo">
                    <iframe
                        id={iframeId}
                        src={embedUrl}
                        title={fullContent.Name || 'Video'}
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onError={() => setVideoError(true)}
                    />
                </div>
            );
        } else {
            return (
                <div className="sg-previewVideo">
                    <video
                        ref={mediaRef}
                        src={fullContent.VideoUrl}
                        controls
                        className="sg-media-player"
                        style={{ width: '100%', height: '100%' }}
                        onPlay={dispatchPlayEvent}
                        onEnded={handleMediaEnded}
                        onError={() => setVideoError(true)}
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>
            );
        }
    };
    
    // Render audio player
    const renderAudio = () => {
        if (!showAudio) return null;
        
        // Show error state if audio failed to load
        if (audioError) {
            return (
                <div className="sg-media-unavailable">
                    <span className="material-symbols-outlined">volume_off</span>
                    <span>Audio unavailable</span>
                </div>
            );
        }
        
        return (
            <audio
                ref={mediaRef}
                src={audioUrl}
                controls
                className="sg-media-player"
                data-audio-player="true"
                onPlay={dispatchPlayEvent}
                onEnded={handleMediaEnded}
                onError={() => setAudioError(true)}
            >
                Your browser does not support the audio tag.
            </audio>
        );
    };
    
    // Helper to escape regex special characters
    const escapeRegex = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    // Helper to highlight text
    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const escapedQuery = escapeRegex(query);
        const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? 
                <span key={i} className="sg-highlight">{part}</span> : part
        );
    };

    // Render transcript
    const renderTranscript = () => {
        if (!sentences.length) return null;
        
        // Hide transcript completely until playback starts
        if (!showTranscriptContainer || visibleSentences.length === 0) {
            return null;
        }
        
        return (
            <div className="sg-transcript-wrapper">
                <div 
                    className="sg-transcript-header-row" 
                    onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <span className="sg-transcript-label">Transcript</span>
                        
                        <div style={{ marginLeft: 'auto', marginRight: '10px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                            {/* Search Input */}
                            <div 
                                className={`sg-search-pill-wrap ${transcriptSearchQuery ? 'has-value' : ''}`}
                                style={{ margin: 0 }}
                            >
                            <span className="material-symbols-outlined sg-search-icon">search</span>
                            <input
                                type="text"
                                placeholder="..."
                                value={transcriptSearchQuery}
                                onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                                className="sg-search-pill-input"
                            />
                        </div>

                            {/* Search Controls (Only show if multiple matches) */}
                            {searchMatches.length > 1 && (
                                <div className="sg-search-controls">
                                    <span className="sg-search-counter">
                                        {`${currentMatchIndex + 1}/${searchMatches.length}`}
                                    </span>
                                    <button className="sg-search-btn" onClick={handlePrevMatch} title="Previous Match">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                    <button className="sg-search-btn" onClick={handleNextMatch} title="Next Match">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <span className={`sg-transcript-toggle ${isTranscriptExpanded ? 'expanded' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </span>
                </div>

                {isTranscriptExpanded && (
                    <div className="sg-transcript-container" ref={transcriptContainerRef}>
                        <div className="sg-transcript-scroll" ref={transcriptScrollRef}>
                            {/* Only render visible sentences */}
                            {visibleSentences.map((sentence) => {
                                // Find the original index in sentences array for active/search matching
                                const originalIdx = sentences.findIndex(s => s === sentence);
                                const isActive = activeSentenceIndex === originalIdx;
                                const isCurrentMatch = currentMatchIndex >= 0 && searchMatches[currentMatchIndex] === originalIdx;
                                
                                return (
                                    <div
                                        key={`sentence-${sentence.index || originalIdx}`}
                                        data-sentence-index={originalIdx}
                                        className={`sg-transcript-sentence ${isActive ? 'sg-transcript-active' : ''} ${isCurrentMatch ? 'sg-transcript-current-match' : ''}`}
                                        onClick={() => handleSentenceClick(sentence)}
                                    >
                                        {highlightText(sentence.text, transcriptSearchQuery)}
                                    </div>
                                );
                            })}
                        </div>
                        {showScrollToBottom && (
                            <button
                                className="sg-transcript-scroll-to-bottom"
                                onClick={scrollToBottom}
                                aria-label="Scroll to bottom"
                                type="button"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 14L5 9L6.41 7.59L10 11.17L13.59 7.59L15 9L10 14Z" fill="currentColor"/>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // If closed, show simple card
    if (!isOpen) {
        return (
            <article 
                className={`sg-card sg2 ${viewMode === "grid" ? "sg-card-grid" : "sg-card-list"}`}
                onClick={() => onToggle(item._id)}
            >
                <header className="sg2-head">
                    <div className="sg2-headLeft">
                        <span className="sg2-favicon sg2-fallback" />
                        <span className="sg2-domain">{getSourceDomain()}</span>
                        {formattedDate && (
                            <>
                                <span className="sg2-dot" />
                                <span className="sg2-calendar" aria-hidden="true">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.25 10C1.05 10 0.875 9.925 0.725 9.775C0.575 9.625 0.5 9.45 0.5 9.25V1.5C0.5 1.3 0.575 1.125 0.725 0.975C0.875 0.825 1.05 0.75 1.25 0.75H2.0625V0H2.875V0.75H7.125V0H7.9375V0.75H8.75C8.95 0.75 9.125 0.825 9.275 0.975C9.425 1.125 9.5 1.3 9.5 1.5V9.25C9.5 9.45 9.425 9.625 9.275 9.775C9.125 9.925 8.95 10 8.75 10H1.25ZM1.25 9.25H8.75V3.875H1.25V9.25ZM1.25 3.125H8.75V1.5H1.25V3.125ZM5 6C4.85833 6 4.73958 5.95208 4.64375 5.85625C4.54792 5.76042 4.5 5.64167 4.5 5.5C4.5 5.35833 4.54792 5.23958 4.64375 5.14375C4.73958 5.04792 4.85833 5 5 5C5.14167 5 5.26042 5.04792 5.35625 5.14375C5.45208 5.23958 5.5 5.35833 5.5 5.5C5.5 5.64167 5.45208 5.76042 5.35625 5.85625C5.26042 5.95208 5.14167 6 5 6ZM3 6C2.85833 6 2.73957 5.95208 2.64375 5.85625C2.54792 5.76042 2.5 5.64167 2.5 5.5C2.5 5.35833 2.54792 5.23958 2.64375 5.14375C2.73957 5.04792 2.85833 5 3 5C3.14167 5 3.26042 5.04792 3.35625 5.14375C3.45207 5.23958 3.5 5.35833 3.5 5.5C3.5 5.64167 3.45207 5.76042 3.35625 5.85625C3.26042 5.95208 3.14167 6 3 6ZM7 6C6.85833 6 6.73958 5.95208 6.64375 5.85625C6.54792 5.76042 6.5 5.64167 6.5 5.5C6.5 5.35833 6.54792 5.23958 6.64375 5.14375C6.73958 5.04792 6.85833 5 7 5C7.14167 5 7.26042 5.04792 7.35625 5.14375C7.45208 5.23958 7.5 5.35833 7.5 5.5C7.5 5.64167 7.45208 5.76042 7.35625 5.85625C7.26042 5.95208 7.14167 6 7 6ZM5 8C4.85833 8 4.73958 7.95208 4.64375 7.85625C4.54792 7.76042 4.5 7.64167 4.5 7.5C4.5 7.35833 4.54792 7.23958 4.64375 7.14375C4.73958 7.04792 4.85833 7 5 7C5.14167 7 5.26042 7.04792 5.35625 7.14375C5.45208 7.23958 5.5 7.35833 5.5 7.5C5.5 7.64167 5.45208 7.76042 5.35625 7.85625C5.26042 7.95208 5.14167 8 5 8ZM3 8C2.85833 8 2.73957 7.95208 2.64375 7.85625C2.54792 7.76042 2.5 7.64167 2.5 7.5C2.5 7.35833 2.54792 7.23958 2.64375 7.14375C2.73957 7.04792 2.85833 7 3 7C3.14167 7 3.26042 7.04792 3.35625 7.14375C3.45207 7.23958 3.5 7.35833 3.5 7.5C3.5 7.64167 3.45207 7.76042 3.35625 7.85625C3.26042 7.95208 3.14167 8 3 8ZM7 8C6.85833 8 6.73958 7.95208 6.64375 7.85625C6.54792 7.76042 6.5 7.64167 6.5 7.5C6.5 7.35833 6.54792 7.23958 6.64375 7.14375C6.73958 7.04792 6.85833 7 7 7C7.14167 7 7.26042 7.04792 7.35625 7.14375C7.45208 7.23958 7.5 7.35833 7.5 7.5C7.5 7.64167 7.45208 7.76042 7.35625 7.85625C7.26042 7.95208 7.14167 8 7 8Z" fill="#949494"/>
                                    </svg>
                                </span>
                                <span className="sg2-date">{formattedDate}</span>
                            </>
                        )}
                    </div>
                </header>
                <div className="sg2-bodyTitle">
                    <h3 className="sg2-title" title={item.Name}>{item.Name}</h3>
                </div>
                {/* Show "why this matched" snippet */}
                {getHighlightSnippet() && (
                    <p className="sg2-highlight-snippet">{getHighlightSnippet()}</p>
                )}
            </article>
        );
    }

    // OPEN CARD LAYOUT
    return (
        <article 
            className={`sg-card sg2 is-open ${viewMode === "grid" ? "sg-card-grid" : "sg-card-list"} ${isNowPlaying && isPinned ? 'sg-now-playing-card' : ''}`}
            style={isNowPlaying && isPinned ? { order: -1 } : {}}
        >
            
            {/* 1. Title & Info (Top) */}
            <div className="sg-card-header-section">
                <div className="sg2-head">
                    <div className="sg2-headLeft">
                        <span className="sg2-favicon sg2-fallback" />
                        <span className="sg2-domain">{getSourceDomain()}</span>
                        {formattedDate && (
                            <>
                                <span className="sg2-dot" />
                                <span className="sg2-calendar" aria-hidden="true">
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.25 10C1.05 10 0.875 9.925 0.725 9.775C0.575 9.625 0.5 9.45 0.5 9.25V1.5C0.5 1.3 0.575 1.125 0.725 0.975C0.875 0.825 1.05 0.75 1.25 0.75H2.0625V0H2.875V0.75H7.125V0H7.9375V0.75H8.75C8.95 0.75 9.125 0.825 9.275 0.975C9.425 1.125 9.5 1.3 9.5 1.5V9.25C9.5 9.45 9.425 9.625 9.275 9.775C9.125 9.925 8.95 10 8.75 10H1.25ZM1.25 9.25H8.75V3.875H1.25V9.25ZM1.25 3.125H8.75V1.5H1.25V3.125ZM5 6C4.85833 6 4.73958 5.95208 4.64375 5.85625C4.54792 5.76042 4.5 5.64167 4.5 5.5C4.5 5.35833 4.54792 5.23958 4.64375 5.14375C4.73958 5.04792 4.85833 5 5 5C5.14167 5 5.26042 5.04792 5.35625 5.14375C5.45208 5.23958 5.5 5.35833 5.5 5.5C5.5 5.64167 5.45208 5.76042 5.35625 5.85625C5.26042 5.95208 5.14167 6 5 6ZM3 6C2.85833 6 2.73957 5.95208 2.64375 5.85625C2.54792 5.76042 2.5 5.64167 2.5 5.5C2.5 5.35833 2.54792 5.23958 2.64375 5.14375C2.73957 5.04792 2.85833 5 3 5C3.14167 5 3.26042 5.04792 3.35625 5.14375C3.45207 5.23958 3.5 5.35833 3.5 5.5C3.5 5.64167 3.45207 5.76042 3.35625 5.85625C3.26042 5.95208 3.14167 6 3 6ZM7 6C6.85833 6 6.73958 5.95208 6.64375 5.85625C6.54792 5.76042 6.5 5.64167 6.5 5.5C6.5 5.35833 6.54792 5.23958 6.64375 5.14375C6.73958 5.04792 6.85833 5 7 5C7.14167 5 7.26042 5.04792 7.35625 5.14375C7.45208 5.23958 7.5 5.35833 7.5 5.5C7.5 5.64167 7.45208 5.76042 7.35625 5.85625C7.26042 5.95208 7.14167 6 7 6ZM5 8C4.85833 8 4.73958 7.95208 4.64375 7.85625C4.54792 7.76042 4.5 7.64167 4.5 7.5C4.5 7.35833 4.54792 7.23958 4.64375 7.14375C4.73958 7.04792 4.85833 7 5 7C5.14167 7 5.26042 7.04792 5.35625 7.14375C5.45208 7.23958 5.5 7.35833 5.5 7.5C5.5 7.64167 5.45208 7.76042 5.35625 7.85625C5.26042 7.95208 5.14167 8 5 8ZM3 8C2.85833 8 2.73957 7.95208 2.64375 7.85625C2.54792 7.76042 2.5 7.64167 2.5 7.5C2.5 7.35833 2.54792 7.23958 2.64375 7.14375C2.73957 7.04792 2.85833 7 3 7C3.14167 7 3.26042 7.04792 3.35625 7.14375C3.45207 7.23958 3.5 7.35833 3.5 7.5C3.5 7.64167 3.45207 7.76042 3.35625 7.85625C3.26042 7.95208 3.14167 8 3 8ZM7 8C6.85833 8 6.73958 7.95208 6.64375 7.85625C6.54792 7.76042 6.5 7.64167 6.5 7.5C6.5 7.35833 6.54792 7.23958 6.64375 7.14375C6.73958 7.04792 6.85833 7 7 7C7.14167 7 7.26042 7.04792 7.35625 7.14375C7.45208 7.23958 7.5 7.35833 7.5 7.5C7.5 7.64167 7.45208 7.76042 7.35625 7.85625C7.26042 7.95208 7.14167 8 7 8Z" fill="#949494"/>
                                    </svg>
                                </span>
                                <span className="sg2-date">{formattedDate}</span>
                            </>
                        )}
                    </div>
                    <div className="sg2-headRight">
                        {isPinned && onClose && (
                            <button className="sg-now-playing-close" onClick={onClose} aria-label="Close Now Playing" title="Close Now Playing">
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Title Section (Missing in Open View) */}
            <div className="sg2-bodyTitle">
                <h3 className="sg2-title" title={item.title || item.Name}>{item.title || item.Name}</h3>
            </div>
            
            {/* Show "why this matched" snippet */}
            {getHighlightSnippet() && (
                <p className="sg2-highlight-snippet">{getHighlightSnippet()}</p>
            )}
            
            {/* Show media (full width) */}
            {(showVideo || showAudio) && (
                <div className="sg-media-container sg-now-playing-full">
                    {!loadingContent && !contentError && (
                        <>
                            {showVideo && renderVideo()}
                            {showAudio && renderAudio()}
                        </>
                    )}
                </div>
            )}

            {/* 3. Search & Transcript (Bottom) */}
            <div className="sg-search-section">
                {/* Transcript contains search UI now */}
                {renderTranscript()}
            </div>
        </article>
    );
}

const DEFAULT_URL = "https://splinteredglass.retool.com/url/search";
const DEFAULT_ORG = "67355031aea5f406546577d0";
const CONTENT_URL = "https://splinteredglass.retool.com/url/content";

async function fetchSingleContent(contentId, authHeader, setContentMap, setLoadingContent, setContentErrors) {
    if (!contentId) return;
    
    setLoadingContent(prev => new Set(prev).add(contentId));
    
    try {
        const res = await web.post(
            CONTENT_URL,
            { content_id: contentId },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    ...(authHeader ? { "Authorization": authHeader } : {}),
                },
            }
        );
        
        if (res.status === 200 && res.data?.data?.[0]) {
            setContentMap(prev => new Map(prev).set(contentId, res.data.data[0]));
            setContentErrors(prev => {
                const newMap = new Map(prev);
                newMap.delete(contentId);
                return newMap;
            });
        } else {
            throw new Error(res?.error || `HTTP ${res.status}`);
        }
    } catch (error) {
        setContentErrors(prev => new Map(prev).set(contentId, error?.message || "Failed to load content"));
    } finally {
        setLoadingContent(prev => {
            const newSet = new Set(prev);
            newSet.delete(contentId);
            return newSet;
        });
    }
}

async function batchFetchContent(ids, batchSize, authHeader, setContentMap, setLoadingContent, setContentErrors) {
    if (!ids || ids.length === 0) return;
    
    const batches = [];
    for (let i = 0; i < ids.length; i += batchSize) {
        batches.push(ids.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
        const promises = batch.map(id => 
            fetchSingleContent(id, authHeader, setContentMap, setLoadingContent, setContentErrors)
        );
        await Promise.allSettled(promises);
    }
}

function Tapos({
    search,
    trigger = 0,
    organizationId = DEFAULT_ORG,
    authHeader = null,
    cacheTtl = null,
    url = DEFAULT_URL,
    enabled = true,
    className = "",
    level = "chapter",
    baselineQuery = "",
    label = "",
}) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [openIds, setOpenIds] = useState(new Set());
    const [viewMode, setViewMode] = useState("grid"); // "list" or "grid"
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [displayedCount, setDisplayedCount] = useState(10);
    const [allData, setAllData] = useState([]);
    const [contentMap, setContentMap] = useState(new Map());
    const [loadingContent, setLoadingContent] = useState(new Set());
    const [contentErrors, setContentErrors] = useState(new Map());
    const [showSpinner, setShowSpinner] = useState(false);
    const [nowPlayingId, setNowPlayingId] = useState(null);
    const baselineQueryRef = useRef(baselineQuery || "");
    const resolvedLevel = (level || "chapter").toLowerCase();
    const isVerseLevel = resolvedLevel === "verse";
    const currentBaselineQuery = baselineQuery || baselineQueryRef.current;
    const headerLabel = label || (
        isVerseLevel && currentBaselineQuery
            ? currentBaselineQuery
            : (search || "")
    );
    const showResetControl = Boolean(isVerseLevel && currentBaselineQuery);
    
    useEffect(() => {
        baselineQueryRef.current = baselineQuery || baselineQueryRef.current;
    }, [baselineQuery]);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!enabled || !search || !search.trim()) {
                   setData([]); setAllData([]); setErr(""); setOpenIds(new Set()); setHasMore(false); setDisplayedCount(10);
                return;
            }
            setLoading(true); setErr(""); setOpenIds(new Set()); setHasMore(false); setDisplayedCount(10);

            try {
                const res = await web.post(
                    url,
                    { 
                        _OrganizationId: organizationId, 
                        search: search.trim(),
                        limit: 100 // Get all results
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            ...(authHeader ? { "Authorization": authHeader } : {}),
                        },
                    }
                );

                if (cancelled) return;

                if (res.status !== 200) {
                    setErr(res?.error || `HTTP ${res.status}`);
                    setData([]); setAllData([]); setOpenIds(new Set());
                    return;
                }

                const allResults = Array.isArray(res?.data?.data) ? res.data.data : [];
                
                // Debug: Log API response structure to investigate score/highlights fields
                if (allResults.length > 0) {
                    console.log('[Tapos API Response]', {
                        totalResults: allResults.length,
                        firstResult: allResults[0],
                        hasScore: 'score' in (allResults[0] || {}),
                        hasHighlights: 'highlights' in (allResults[0] || {}),
                        sampleFields: Object.keys(allResults[0] || {}),
                    });
                }
                
                // Score-based relevance filtering
                // Chapter: show results with score ≥ 20
                // Verse: show results with score ≥ 10
                const searchLevel = globalThis.GlobalSearchLevel || level || "chapter";
                const scoreThreshold = searchLevel === "verse" ? 10 : 20;
                
                const filteredResults = allResults.filter(item => {
                    const score = item.score ?? 0;
                    return score >= scoreThreshold;
                });
                
                console.log('[Tapos Filtering]', {
                    searchLevel,
                    scoreThreshold,
                    beforeFilter: allResults.length,
                    afterFilter: filteredResults.length,
                });
                
                // Limit to top 5 results for better relevance
                const limitedResults = filteredResults.slice(0, 5);
                
                setAllData(limitedResults);
                setData(limitedResults.slice(0, 10)); // Show first 10 (or all 5)
                setHasMore(limitedResults.length > 10); // Show "Load More" if there are more than 10 results
                // Open all cards initially
                setOpenIds(new Set(limitedResults.map((item) => item._id)));
                
                // Reset content maps for new search
                setContentMap(new Map());
                setLoadingContent(new Set());
                setContentErrors(new Map());
                
                // Batch fetch content for first 10 displayed items
                const firstBatchIds = limitedResults.slice(0, 10)
                    .map(item => item._id)
                    .filter(Boolean);
                
                if (firstBatchIds.length > 0) {
                    batchFetchContent(firstBatchIds, 10, authHeader, setContentMap, setLoadingContent, setContentErrors);
                }
            } catch (e) {
                if (!cancelled) {
                    setErr(e?.message || "Network error");
                    setData([]); setAllData([]); setOpenIds(new Set());
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();
        return () => { cancelled = true; };
    }, [search, trigger, organizationId, authHeader, cacheTtl, url, enabled, level, baselineQuery]);

    useEffect(() => {
        let timer;
        if (loading) {
            timer = setTimeout(() => setShowSpinner(true), 2000);
        } else {
            setShowSpinner(false);
        }
        return () => clearTimeout(timer);
    }, [loading]);

    const handleResetToBaseline = () => {
        if (!currentBaselineQuery) return;
        
        const helper = globalThis.UpdateStudyNoteSearch;
        if (typeof helper === "function") {
            helper(currentBaselineQuery, {
                level: "chapter",
                forceRefresh: true,
            });
        } else {
            globalThis.GlobalSearch = currentBaselineQuery;
            globalThis.GlobalSearchLevel = "chapter";
            globalThis.GlobalSearchLabel = currentBaselineQuery;
        }
    };

    const loadMore = () => {
        if (loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
            const newDisplayedCount = displayedCount + 10;
            const newData = allData.slice(0, newDisplayedCount);
            
            setData(newData);
            setDisplayedCount(newDisplayedCount);
            setHasMore(newDisplayedCount < allData.length);
            setLoadingMore(false);
            
            // Fetch content for newly displayed items
            const newIds = allData.slice(displayedCount, newDisplayedCount)
                .map(item => item._id)
                .filter(id => id && !contentMap.has(id) && !loadingContent.has(id));
            
            if (newIds.length > 0) {
                batchFetchContent(newIds, 10, authHeader, setContentMap, setLoadingContent, setContentErrors);
            }
        }, 300);
    };

    if (!search?.trim()) {
        return <div className="sg-muted">Type a search to begin…</div>;
    }

    if (showSpinner) {
        return (
            <div className={`sg-loading ${className}`} aria-busy="true" aria-live="polite">
                <div className="sg-spinner" role="status" aria-label="Loading" />
                <div className="sg-loading-text">Loading…</div>
                <style>{getStyleOf('apologist.css')}</style>
            </div>
        );
    }

    if (err) {
        return (
            <div className="sg-error">
                <b>Search error:</b> {err}
                <div className="sg-muted sg-small">If you see a CORS error, allow this origin in Retool or use a proxy.</div>
                <style>{getStyleOf('apologist.css')}</style>
            </div>
        );
    }

    // Get the currently playing item for the Now Playing section
    const nowPlayingItem = nowPlayingId ? data.find(item => item._id === nowPlayingId) : null;
    const nowPlayingContent = nowPlayingId ? contentMap.get(nowPlayingId) : null;

    return (
        <div className={`sg-searchWrap ${className}`}>
            <div className="sg-header">
                {data && data.length > 0 && (
                    <div className="sg-headerTop">
                        {showResetControl && (
                            <button
                                type="button"
                                className="sg-resetBtn"
                                onClick={handleResetToBaseline}
                                title={`Back to ${currentBaselineQuery}`}
                                aria-label="Back to chapter search"
                            >
                                ×
                            </button>
                        )}
                        <div className="sg-resultCount">{headerLabel || 'Results'} | {data.length} Results</div>
                    <div className="sg-viewToggle">
                            <button
                                className={`sg-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                                onClick={() => setViewMode("list")}
                                title="List View"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 5L2 5C1.73487 4.99971 1.48069 4.89426 1.29321 4.70679C1.10574 4.51931 1.00029 4.26513 1 4L1 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2V4C14.9997 4.26513 14.8943 4.51931 14.7068 4.70679C14.5193 4.89426 14.2651 4.99971 14 5ZM2 2L2 4L14 4V2L2 2Z" fill="currentColor"/>
                                    <path d="M14 15L2 15C1.73487 14.9997 1.48069 14.8943 1.29321 14.7068C1.10574 14.5193 1.00029 14.2651 1 14L1 12C1.00028 11.7349 1.10572 11.4807 1.2932 11.2932C1.48068 11.1057 1.73487 11.0003 2 11L14 11C14.2651 11.0003 14.5193 11.1057 14.7068 11.2932C14.8943 11.4807 14.9997 11.7349 15 12V14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15ZM2 12L2 14L14 14V12L2 12Z" fill="currentColor"/>
                                    <path d="M14 10L2 10C1.73487 9.99971 1.48069 9.89426 1.29321 9.70679C1.10574 9.51931 1.00029 9.26513 1 9L1 7C1.00028 6.73487 1.10572 6.48068 1.2932 6.2932C1.48068 6.10572 1.73487 6.00028 2 6L14 6C14.2651 6.00028 14.5193 6.10572 14.7068 6.2932C14.8943 6.48068 14.9997 6.73487 15 7V9C14.9997 9.26513 14.8943 9.51931 14.7068 9.70679C14.5193 9.89426 14.2651 9.99971 14 10ZM2 7L2 9L14 9V7L2 7Z" fill="currentColor"/>
                                </svg>
                            </button>
                            <button
                                className={`sg-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                                onClick={() => setViewMode("grid")}
                                title="Grid View"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 2L15 14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15L10 15C9.73487 14.9997 9.48068 14.8943 9.2932 14.7068C9.10572 14.5193 9.00028 14.2651 9 14L9 2C9.00028 1.73487 9.10572 1.48068 9.2932 1.2932C9.48068 1.10572 9.73487 1.00028 10 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2ZM10 14L14 14L14 2L10 2L10 14Z" fill="currentColor"/>
                                    <path d="M7 2L7 14C6.99972 14.2651 6.89428 14.5193 6.7068 14.7068C6.51932 14.8943 6.26513 14.9997 6 15L2 15C1.73487 14.9997 1.48068 14.8943 1.2932 14.7068C1.10572 14.5193 1.00028 14.2651 1 14L0.999999 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L6 1C6.26513 1.00028 6.51932 1.10572 6.7068 1.2932C6.89428 1.48068 6.99972 1.73487 7 2ZM2 14L6 14L6 2L2 2L2 14Z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Now Playing Section pinned at top */}
            {nowPlayingItem && (
                <div className="sg-now-playing-section" style={{ marginBottom: '20px' }}>
                     <SgCard 
                         key={`now-playing-${nowPlayingItem._id}`}
                         item={nowPlayingItem}
                         isOpen={true}
                         onToggle={() => {}} 
                         viewMode="list"
                         fullContent={nowPlayingContent}
                         loadingContent={loadingContent.has(nowPlayingId)}
                         contentError={contentErrors.get(nowPlayingId)}
                         isNowPlaying={true}
                         setNowPlayingId={setNowPlayingId}
                         onClose={() => setNowPlayingId(null)}
                         isPinned={true}
                     />
                </div>
            )}

            <div className={`sg-results ${viewMode === "grid" ? "sg-grid" : "sg-list"} ${className}`} key={`results-${Boolean(data?.length)}-${search}`}>
                {data && data.length > 0 ? (
                    <>
                        {data.map((item, i) => {
                            // Skip the item if it is currently pinned at the top
                            if (item._id === nowPlayingId) return null;
                            
                            return (
                                <SgCard
                                    key={item?._id ? String(item._id) : `row-${i}`}
                                    item={item}
                                    isOpen={openIds.has(item._id)}
                                    viewMode={viewMode}
                                    onToggle={(id) => {
                                        setOpenIds(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(id)) {
                                                newSet.delete(id);
                                            } else {
                                                newSet.add(id);
                                            }
                                            return newSet;
                                        });
                                    }}
                                    fullContent={contentMap.get(item._id)}
                                    loadingContent={loadingContent.has(item._id)}
                                    contentError={contentErrors.get(item._id)}
                                    isNowPlaying={nowPlayingId === item._id}
                                    setNowPlayingId={setNowPlayingId}
                                />
                            );
                        })}
                        {hasMore && (
                            <div className="sg-loadMore">
                                <button 
                                    className="sg-loadMoreBtn" 
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="sg-spinner-small"></div>
                                            Loading...
                                        </>
                                    ) : (
                                        'Load More'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    !loading && (
                    <div className="sg-empty">
                        <div className="sg-emptyIcon">🔎</div>
                        <div className="sg-emptyTitle">No results</div>
                        <div className="sg-emptyHint">Try a broader term or different keywords.</div>
                    </div>
                )
                )}
            </div>

            <style>{getStyleOf('apologist.css')}</style>
            <style>{`
                .sg-loadMore {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 10px 0;
                    width: 100%;
                    grid-column: 1 / -1; /* Span all columns in grid mode */
                    text-align: center;
                }

                /* Now Playing Card - Full width and highlighted */
                .sg-now-playing-card {
                    grid-column: 1 / -1 !important; /* Span all columns in grid mode */
                    width: 100% !important;
                    border: 2px solid #8ca443 !important;
                    box-shadow: 0 4px 16px rgba(140, 164, 67, 0.2) !important;
                    background: linear-gradient(135deg, #f8faf3 0%, #fff 100%) !important;
                }

                .sg-now-playing-card::before {
                    content: 'NOW PLAYING';
                    display: block;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #8ca443;
                    background: rgba(140, 164, 67, 0.15);
                    padding: 4px 10px;
                    border-radius: 4px;
                    margin-bottom: 12px;
                    width: fit-content;
                }
                
                /* Now Playing Section (unused now but kept for reference) */
                .sg-now-playing {
                    width: 100%;
                    background: linear-gradient(135deg, #f8faf3 0%, #fff 100%);
                    border: 2px solid #8ca443;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 16px rgba(140, 164, 67, 0.15);
                }

                .sg-now-playing-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .sg-now-playing-label {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #8ca443;
                    background: rgba(140, 164, 67, 0.15);
                    padding: 4px 8px;
                    border-radius: 4px;
                }

                .sg-now-playing-title {
                    flex: 1;
                    font-size: 16px;
                    font-weight: 500;
                    color: #0f172a;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .sg-now-playing-close {
                    background: transparent;
                    border: none;
                    font-size: 24px;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px 8px;
                    line-height: 1;
                    border-radius: 4px;
                    transition: background 0.2s, color 0.2s;
                }

                .sg-now-playing-close:hover {
                    background: rgba(0,0,0,0.05);
                    color: #64748b;
                }

                .sg-now-playing-media {
                    width: 100%;
                }

                .sg-now-playing-media .sg-card.sg2 {
                    border: none;
                    box-shadow: none;
                    padding: 0;
                }

                .sg-now-playing-media .sg-card-header-section {
                    display: none;
                }

                .sg-media-unavailable {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 32px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    color: #64748b;
                    font-size: 14px;
                }
                
                .sg-media-unavailable .material-symbols-outlined {
                    font-size: 24px;
                    color: #94a3b8;
                }

                .sg2-highlight-snippet {
                    margin: 4px 12px 8px;
                    padding: 8px 10px;
                    background: rgba(140, 164, 67, 0.08);
                    border-left: 3px solid #8ca443;
                    border-radius: 4px;
                    font-size: 12px;
                    line-height: 1.4;
                    color: #6b7280;
                    font-style: italic;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                }

                .sg-loadMoreBtn {
                    padding: 12px 24px;
                    background: transparent;
                    color: #8ca443;
                    border-radius: 6px;
                    border: 1px solid #8ca443;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .sg-loadMoreBtn:hover:not(:disabled) {
                    background: #7a923a;
                }
                
                .sg-loadMoreBtn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                
                .sg-header {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-bottom: 16px;
                }
                
                .sg-headerTop {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 12px;
                }
                
                .sg-resultCount {
                    font-size: 14px;
                    color: #666;
                    font-weight: 500;
                }
                
                .sg-viewToggle {
                    display: flex;
                    gap: 4px;
                }
                
                .sg-resetBtn {
                    border: none;
                    background: transparent;
                    color: #8ca443;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    line-height: 1;
                }
                
                .sg-resetBtn:hover {
                    color: #7a923a;
                }
                
                /* Sermon card polish */
                .sg-card.sg2 {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.08s ease;
                    box-sizing: border-box;
                }
                
                .sg-card.sg2.sg-card-list {
                    padding: 12px 14px;
                }
                
                .sg-card.sg2.sg-card-grid {
                    padding: 16px;
                }
                
                .sg-card.sg2:hover {
                    border-color: #94a3b8;
                    box-shadow: 0 10px 22px rgba(16, 24, 40, 0.1);
                }
                
                .sg-card.sg2:active {
                    transform: translateY(1px);
                }
                
                .sg-card.sg2.is-open {
                    border: 2px solid #94a3b8;
                    box-shadow: 0 10px 30px rgba(148, 163, 184, 0.15);
                }
                
                /* Only now-playing card gets green border */
                .sg-card.sg2.sg-now-playing-card,
                .sg-card.sg2.sg-now-playing-card:hover {
                    border: 2px solid #8ca443;
                    box-shadow: 0 10px 30px rgba(140, 164, 67, 0.15);
                }
                
                .sg2-bodyTitle {
                    display: flex;
                    flex-direction: row;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                }
                
                .sg2-title {
                    margin: 0 0 6px 0;
                    color: #0f172a;
                    font-weight: 300;
                    font-size: 16px;
                    line-height: 1.35;
                    word-break: break-word;
                }
                
                .sg2-date {
                    color: #949494;
                    font-size: 12px;
                }
                
                .sg2-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 8px;
                }
                
                .sg2-headLeft {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    flex-wrap: wrap;
                }
                
                .sg2-favicon {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    display: block;
                }
                
                .sg2-favicon.sg2-fallback {
                    background: #cbd5e1;
                }
                
                .sg2-domain {
                    color: #949494;
                    font-weight: 100;
                    font-size: 13px;
                    max-width: 55vw;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                
                .sg2-dot {
                    width: 1px;
                    height: 10px;
                    background: #a3a3a3;
                    border-radius: 5px;
                    display: inline-block;
                }
                
                .sg2-calendar {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .sg-transcript-container {
                    border: 1px solid rgba(148, 163, 184, 0.4);
                    border-radius: 12px;
                    padding: 6px;
                    background: #fff;
                }
                
                .sg-transcript-sentence {
                    padding: 6px 8px;
                    border-radius: 8px;
                    margin-bottom: 4px;
                    transition: background 0.2s;
                }
                
                .sg-transcript-active {
                    background: rgba(140, 164, 67, 0.12);
                }
                
                .sg-transcript-current-match {
                    box-shadow: 0 0 0 2px rgba(140, 164, 67, 0.4) inset;
                }
                
                .sg-transcript-scroll-to-bottom {
                    background: #8ca443;
                    color: #fff;
                    border: none;
                }

                /* Video Player Styling (matched to Apologist) */
                .sg-previewVideo {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16 / 9;
                    background: #000;
                    border-radius: 10px;
                    overflow: hidden;
                    margin-bottom: 12px; /* Add some spacing below video */
                }

                .sg-previewVideo iframe,
                .sg-previewVideo video {
                    width: 100%;
                    height: 100%;
                    border: none;
                    display: block;
                    object-fit: cover; /* Ensures video fills container */
                }

                /* --- Search Pill Styling (Expanding) --- */
                .sg-search-pill-wrap {
                    position: relative;
                    display: flex;
                    align-items: center;
                    background: #8ca443; /* Green background */
                    border-radius: 20px;
                    height: 32px;
                    width: 32px; /* Collapsed width (circle) */
                    overflow: hidden;
                    transition: width 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.2s;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    cursor: pointer;
                }

                /* Expand when hovered, has focus, or has value */
                .sg-search-pill-wrap:hover,
                .sg-search-pill-wrap:focus-within,
                .sg-search-pill-wrap.has-value {
                    width: 150px;
                    box-shadow: 0 4px 12px rgba(140, 164, 67, 0.3);
                }

                .sg-search-icon {
                    position: absolute;
                    left: 6px; /* Center icon in the 32px circle */
                    color: #fff;
                    font-size: 20px !important;
                    pointer-events: none; /* Let clicks pass through */
                    width: 20px;
                    height: 20px;
                    display: flex; /* Flex to center handle properly if needed */
                    align-items: center;
                    justify-content: center;
                }

                .sg-search-pill-input {
                    width: 100%;
                    height: 100%;
                    border: none;
                    background: transparent;
                    color: #fff;
                    font-size: 14px;
                    padding: 0 12px 0 34px; /* Space for icon */
                    outline: none;
                    opacity: 0;
                    transition: opacity 0.3s;
                    cursor: text;
                }
                
                .sg-search-pill-input::placeholder {
                    color: rgba(255, 255, 255, 0.7);
                }

                /* Revealing input when expanded */
                .sg-search-pill-wrap:hover .sg-search-pill-input,
                .sg-search-pill-wrap:focus-within .sg-search-pill-input,
                .sg-search-pill-wrap.has-value .sg-search-pill-input {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}

globalThis.Tapos = Tapos;
globalThis.TaposSearch = Tapos;

return Tapos;
