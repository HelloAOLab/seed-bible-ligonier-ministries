// SgSearch.jsx
const { useEffect, useState, useMemo, useRef } = os.appHooks;
const getStyleOf = await thisBot.GetStyle();

function SgCard({ item, isOpen, onToggle, viewMode = "list", fullContent, loadingContent, contentError }) {
    // Debug flag for video tracking
    const DEBUG_VIDEO_TRACKING = true; // Set to false to disable logs
    
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
    
    // Search Navigation State
    const [searchMatches, setSearchMatches] = useState([]); // Array of sentence indices
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

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
        if (DEBUG_VIDEO_TRACKING) {
            console.log('[Transcript] updateTranscriptVisibility called with time:', time);
        }
        const visible = sentences.filter(s => s.start !== undefined && s.start <= time);
        const wasAtBottom = isAtBottom();
        const hadNewSentences = visible.length > visibleSentences.length;
        
        if (visible.length > 0 && !showTranscriptContainer) {
            setShowTranscriptContainer(true);
        }
        
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
        setActiveSentenceIndex(activeIdx);
        
        if (DEBUG_VIDEO_TRACKING) {
            console.log('[Transcript] Active sentence index:', activeIdx, 'Visible sentences:', visible.length);
        }
        
        // Auto-scroll if user is at bottom and new sentences appear
        if (hadNewSentences && wasAtBottom && activeIdx >= 0 && transcriptScrollRef.current) {
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
                
                setTimeout(() => {
                    const isAtBottomNow = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
                    setShowScrollToBottom(!isAtBottomNow);
                }, 100);
            }, 100);
        }
    };

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
                                            if (DEBUG_VIDEO_TRACKING) {
                                                console.log('[YouTube] Video playing - starting time tracking');
                                            }
                                            
                                            // Cancel any existing tracking
                                            if (youtubePlayerRef.current?._trackingFrameId) {
                                                cancelAnimationFrame(youtubePlayerRef.current._trackingFrameId);
                                            }
                                            
                                            // Use requestAnimationFrame for smooth updates
                                            const trackTime = () => {
                                                const player = youtubePlayerRef.current;
                                                if (!player) return;
                                                
                                                try {
                                                    // Call methods directly on the player to avoid "Illegal invocation"
                                                    const playerState = player.getPlayerState();
                                                    
                                                    if (DEBUG_VIDEO_TRACKING) {
                                                        console.log('[YouTube] trackTime loop - state:', playerState);
                                                    }
                                                    
                                                    // Only continue tracking if playing (state 1)
                                                    if (playerState === 1) {
                                                        const currentTime = player.getCurrentTime();
                                                        if (DEBUG_VIDEO_TRACKING) {
                                                            console.log('[YouTube] trackTime - currentTime:', currentTime);
                                                        }
                                                        
                                                        if (
                                                            currentTime !== undefined &&
                                                            typeof currentTime === 'number' &&
                                                            !isNaN(currentTime) &&
                                                            currentTime >= 0
                                                        ) {
                                                            updateTranscriptVisibility(currentTime);
                                                        }
                                                        
                                                        // ALWAYS continue the loop while playing - schedule next frame
                                                        player._trackingFrameId = window.requestAnimationFrame(trackTime);
                                                    } else {
                                                        // Video paused, ended, or unstarted - stop tracking
                                                        player._trackingFrameId = null;
                                                        if (DEBUG_VIDEO_TRACKING) {
                                                            console.log('[YouTube] Stopping time tracking, state:', playerState);
                                                        }
                                                    }
                                                } catch (err) {
                                                    if (DEBUG_VIDEO_TRACKING) {
                                                        console.error('[YouTube] Error in time tracking:', err);
                                                    }
                                                    if (player) {
                                                        player._trackingFrameId = null;
                                                    }
                                                }
                                            };
                                            
                                            // Start tracking immediately
                                            if (DEBUG_VIDEO_TRACKING) {
                                                console.log('[YouTube] Starting requestAnimationFrame loop');
                                            }
                                            try {
                                                youtubePlayerRef.current._trackingFrameId =
                                                    window.requestAnimationFrame(trackTime);
                                            } catch (err) {
                                                if (DEBUG_VIDEO_TRACKING) {
                                                    console.error('[YouTube] Error starting RAF loop:', err);
                                                }
                                                if (youtubePlayerRef.current) {
                                                    youtubePlayerRef.current._trackingFrameId = null;
                                                }
                                            }
                                        } else if (event.data === 2 || event.data === 0) { // Paused or Ended
                                            // Cancel tracking when paused or ended
                                            if (youtubePlayerRef.current?._trackingFrameId) {
                                                cancelAnimationFrame(youtubePlayerRef.current._trackingFrameId);
                                                youtubePlayerRef.current._trackingFrameId = null;
                                                if (DEBUG_VIDEO_TRACKING) {
                                                    console.log('[YouTube] Video paused/ended - stopping time tracking');
                                                }
                                            }
                                            
                                            // Update transcript one last time with current position when paused
                                            if (event.data === 2 && youtubePlayerRef.current) {
                                                try {
                                                    const currentTime = youtubePlayerRef.current.getCurrentTime();
                                                    if (currentTime !== undefined && typeof currentTime === 'number' && !isNaN(currentTime) && currentTime >= 0) {
                                                        updateTranscriptVisibility(currentTime);
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
                if (DEBUG_VIDEO_TRACKING) {
                    console.log('[YouTube] Destroying player');
                }
                // Cancel any active animation frame tracking
                if (youtubePlayerRef.current._trackingFrameId) {
                    cancelAnimationFrame(youtubePlayerRef.current._trackingFrameId);
                    youtubePlayerRef.current._trackingFrameId = null;
                }
                youtubePlayerRef.current.destroy();
                youtubePlayerRef.current = null;
            }
            // Reset transcript visibility when player is destroyed
            setVisibleSentences([]);
            setShowTranscriptContainer(false);
            setActiveSentenceIndex(-1);
        };
    }, [isYouTube, isOpen, fullContent?.VideoUrl, item._id]);


    // Time tracking for transcript synchronization - Audio AND Video
    useEffect(() => {
        console.log('[Time Tracking] useEffect EXECUTING - before any checks');
        
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
                        updateTranscriptVisibility(time);
                    }
                };
                const handleSeeked = () => {
                    if (audio && audio.tagName === 'AUDIO' && audio.getAttribute('data-audio-player') === 'true' && hasAudio) {
                        updateTranscriptVisibility(audio.currentTime);
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
    }, [hasAudio, sentences.length, isOpen]);

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
        
        const embedUrl = getVideoEmbedUrl(fullContent.VideoUrl);
        
        if (embedUrl) {
            const iframeId = `youtube-player-${item._id}`;
            return (
                <div className="sg-iframeBox">
                    <iframe
                        id={iframeId}
                        src={embedUrl}
                        title={fullContent.Name || 'Video'}
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>
            );
        } else {
            return (
                <video
                    src={fullContent.VideoUrl}
                    controls
                    className="sg-media-player"
                >
                    Your browser does not support the video tag.
                </video>
            );
        }
    };
    
    // Render audio player
    const renderAudio = () => {
        if (!showAudio) return null;
        
        return (
            <audio
                ref={mediaRef}
                src={audioUrl}
                controls
                className="sg-media-player"
                data-audio-player="true"
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
                    <span className="sg-transcript-label">Transcript</span>
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
                <h3 className="sg2-title" title={item.Name}>{item.Name}</h3>
                <p className="sg2-community">{communityLabel}</p>
                {formattedDate && <p className="sg2-date">{formattedDate}</p>}
            </article>
        );
    }

    // OPEN CARD LAYOUT
    return (
        <article className={`sg-card sg2 is-open ${viewMode === "grid" ? "sg-card-grid" : "sg-card-list"}`}>
            
            {/* 1. Title & Info (Top) */}
            <div className="sg-card-header-section">
                <div className="sg-cardHead">
                    <div className="sg-titleWrap">
                        <h3 className="sg-title" title={item.Name}>{item.Name}</h3>
                         <div className="sg-submeta">
                            {/* Metadata */}
                         </div>
                    </div>
                    <button className="sg-cardToggle" onClick={() => onToggle(item._id)}>
                         <div className="sg-caret">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 15L12 9L18 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                         </div>
                    </button>
                </div>

                <p className="sg-community">{communityLabel}</p>
                {formattedDate && <p className="sg-date">{formattedDate}</p>}
                
                <hr className="sg-separator" />
            </div>

            {/* 2. Media (Middle) */}
            <div className={`sg-media-container ${showAudio ? 'sg-media-audio' : ''}`}>
                 {loadingContent && (
                    <div className="sg-media-loading">
                        <div className="sg-spinner-small"></div>
                        <span>Loading media...</span>
                    </div>
                )}
                
                {contentError && (
                    <div className="sg-media-error">
                        <span>⚠️ Failed to load content: {contentError}</span>
                    </div>
                )}

                {!loadingContent && !contentError && (
                    <>
                        {showVideo && renderVideo()}
                        {showAudio && renderAudio()}
                    </>
                )}
            </div>

            {/* 3. Search & Transcript (Bottom) */}
            <div className="sg-search-section">
                {showTranscriptContainer && visibleSentences.length > 0 && (
                    <div className="sg-search-nav">
                        <div className="sg-search-pill-wrap">
                            <span className="material-symbols-outlined sg-search-icon">search</span>
                            <input
                                type="text"
                                placeholder="Keyword Search"
                                value={transcriptSearchQuery}
                                onChange={(e) => setTranscriptSearchQuery(e.target.value)}
                                className="sg-search-pill-input"
                            />
                        </div>
                        <div className="sg-search-controls">
                            <span className="sg-search-counter">
                                {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
                            </span>
                            <button className="sg-search-btn" onClick={handlePrevMatch} disabled={searchMatches.length === 0} title="Previous Match">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 19V5M12 5L5 12M12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                            <button className="sg-search-btn" onClick={handleNextMatch} disabled={searchMatches.length === 0} title="Next Match">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Transcript below search */}
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

function SgSearch({
    search,
    trigger = 0,
    organizationId = DEFAULT_ORG,
    authHeader = null,
    url = DEFAULT_URL,
    enabled = true,
    className = "",
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
                setAllData(allResults);
                setData(allResults.slice(0, 10)); // Show first 10
                setHasMore(allResults.length > 10); // Show "Load More" if there are more than 10 results
                // Open all cards initially
                setOpenIds(new Set(allResults.map((item) => item._id)));
                
                // Reset content maps for new search
                setContentMap(new Map());
                setLoadingContent(new Set());
                setContentErrors(new Map());
                
                // Batch fetch content for first 10 displayed items
                const firstBatchIds = allResults.slice(0, 10)
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
    }, [search, trigger, organizationId, authHeader, url, enabled]);

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

    if (loading) {
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

    return (
        <div className={`sg-searchWrap ${className}`}>
            <div className="sg-header">
                {data && data.length > 0 && (
                    <div className="sg-headerTop">
                        <div className="sg-resultCount">{data.length} Results</div>
                        <div className="sg-viewToggle">
                            <button
                                className={`sg-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                                onClick={() => setViewMode("list")}
                                title="List View"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_439_369)">
                                        <path d="M14 5L2 5C1.73487 4.99971 1.48069 4.89426 1.29321 4.70679C1.10574 4.51931 1.00029 4.26513 1 4L1 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2V4C14.9997 4.26513 14.8943 4.51931 14.7068 4.70679C14.5193 4.89426 14.2651 4.99971 14 5ZM2 2L2 4L14 4V2L2 2Z" fill="currentColor"/>
                                        <path d="M14 15L2 15C1.73487 14.9997 1.48069 14.8943 1.29321 14.7068C1.10574 14.5193 1.00029 14.2651 1 14L1 12C1.00028 11.7349 1.10572 11.4807 1.2932 11.2932C1.48068 11.1057 1.73487 11.0003 2 11L14 11C14.2651 11.0003 14.5193 11.1057 14.7068 11.2932C14.8943 11.4807 14.9997 11.7349 15 12V14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15ZM2 12L2 14L14 14V12L2 12Z" fill="currentColor"/>
                                        <path d="M14 10L2 10C1.73487 9.99971 1.48069 9.89426 1.29321 9.70679C1.10574 9.51931 1.00029 9.26513 1 9L1 7C1.00028 6.73487 1.10572 6.48068 1.2932 6.2932C1.48068 6.10572 1.73487 6.00028 2 6L14 6C14.2651 6.00028 14.5193 6.10572 14.7068 6.2932C14.8943 6.48068 14.9997 6.73487 15 7V9C14.9997 9.26513 14.8943 9.51931 14.7068 9.70679C14.5193 9.89426 14.2651 9.99971 14 10ZM2 7L2 9L14 9V7L2 7Z" fill="currentColor"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_439_369">
                                            <rect width="16" height="16" fill="white"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                            <button
                                className={`sg-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                                onClick={() => setViewMode("grid")}
                                title="Grid View"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_439_733)">
                                        <path d="M15 2L15 14C14.9997 14.2651 14.8943 14.5193 14.7068 14.7068C14.5193 14.8943 14.2651 14.9997 14 15L10 15C9.73487 14.9997 9.48068 14.8943 9.2932 14.7068C9.10572 14.5193 9.00028 14.2651 9 14L9 2C9.00028 1.73487 9.10572 1.48068 9.2932 1.2932C9.48068 1.10572 9.73487 1.00028 10 1L14 1C14.2651 1.00028 14.5193 1.10572 14.7068 1.2932C14.8943 1.48068 14.9997 1.73487 15 2ZM10 14L14 14L14 2L10 2L10 14Z" fill="currentColor"/>
                                        <path d="M7 2L7 14C6.99972 14.2651 6.89428 14.5193 6.7068 14.7068C6.51932 14.8943 6.26513 14.9997 6 15L2 15C1.73487 14.9997 1.48068 14.8943 1.2932 14.7068C1.10572 14.5193 1.00028 14.2651 1 14L0.999999 2C1.00028 1.73487 1.10572 1.48068 1.2932 1.2932C1.48068 1.10572 1.73487 1.00028 2 1L6 1C6.26513 1.00028 6.51932 1.10572 6.7068 1.2932C6.89428 1.48068 6.99972 1.73487 7 2ZM2 14L6 14L6 2L2 2L2 14Z" fill="currentColor"/>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_439_733">
                                            <rect width="16" height="16" fill="white" transform="translate(0 16) rotate(-90)"/>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={`sg-results ${viewMode === "grid" ? "sg-grid" : "sg-list"} ${className}`} key={`results-${Boolean(data?.length)}-${search}`}>
                {data && data.length > 0 ? (
                    <>
                        {data.map((item, i) => (
                            <SgCard
                                key={item?._id ? String(item._id) : `row-${i}`}
                                item={item}
                                isOpen={openIds.has(item._id)}
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
                                viewMode={viewMode}
                                fullContent={contentMap.get(item._id)}
                                loadingContent={loadingContent.has(item._id)}
                                contentError={contentErrors.get(item._id)}
                            />
                        ))}
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
                    <div className="sg-empty">
                        <div className="sg-emptyIcon">🔎</div>
                        <div className="sg-emptyTitle">No results</div>
                        <div className="sg-emptyHint">Try a broader term or different keywords.</div>
                    </div>
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
                
                /* Sermon card polish */
                .sg-card.sg2 {
                    background: #ffffff;
                    border-radius: 18px;
                    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
                    padding: 10px 18px;
                }
                
                .sg-card.sg2 .sg-card-header-section {
                    text-align: center;
                    padding: 20px 24px 12px;
                    position: relative;
                }
                
                .sg-cardHead {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                }
                
                .sg-cardToggle {
                    position: absolute;
                    right: 0;
                    top: -6px;
                }
                
                .sg-titleWrap {
                    flex: 1;
                }
                
                .sg-title,
                .sg2-title {
                    margin: 0;
                    text-align: center;
                }
                
                .sg-community,
                .sg2-community {
                    margin: 6px 0 0;
                    color: #4B5563;
                    text-align: center;
                }
                
                .sg-date,
                .sg2-date {
                    margin: 4px 0 0;
                    color: #6B7280;
                    text-align: center;
                }
                
                .sg-separator {
                    margin-top: 16px;
                    border: 0;
                    border-top: 1px solid rgba(148, 163, 184, 0.35);
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
            `}</style>
        </div>
    );
}

globalThis.TaposSearch = SgSearch;

return SgSearch;
