'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitReview, saveStudySession } from './actions'
import { useRouter } from 'next/navigation'
import { Volume2 } from 'lucide-react'

// Settings
type StudyMode = 'flashcard' | 'multiple-choice' | 'spelling' | 'random'

export function StudySession({ cards, deckId, distractors }: { cards: any[], deckId: string, distractors: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  // Settings state
  const [mode, setMode] = useState<StudyMode>('random')
  const [currentMode, setCurrentMode] = useState<StudyMode>('flashcard')

  // Multiple choice state
  const [options, setOptions] = useState<string[]>([])
  
  // Spelling state
  const [spellingInput, setSpellingInput] = useState('')
  const [spellingError, setSpellingError] = useState(false)

  // Timer state
  const startTimeRef = useRef(Date.now())
  const [cardsReviewed, setCardsReviewed] = useState(0)

  // Initialization per card
  useEffect(() => {
    if (currentIndex >= cards.length) return;
    
    const card = cards[currentIndex];
    
    // Determine mode for this card
    let nextMode = mode;
    if (mode === 'random') {
      const modes: StudyMode[] = ['flashcard', 'multiple-choice', 'spelling'];
      nextMode = modes[Math.floor(Math.random() * modes.length)];
    }
    
    // Ensure we can only do multiple choice if we have distractors
    if (nextMode === 'multiple-choice' && distractors.length < 3) {
      nextMode = 'flashcard';
    }
    
    setCurrentMode(nextMode);
    setShowAnswer(false);
    setSpellingInput('');
    setSpellingError(false);

    // Setup multiple choice
    if (nextMode === 'multiple-choice') {
      const others = distractors.filter(d => d !== card.meaning).sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...others, card.meaning].sort(() => Math.random() - 0.5));
    }

  }, [currentIndex, cards, mode, distractors]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in input
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.code === 'Space' && !showAnswer && currentMode === 'flashcard') {
        e.preventDefault()
        setShowAnswer(true)
      } else if (showAnswer && !loading) {
        if (e.key === '1') handleReview(1) // 不会
        if (e.key === '2') handleReview(3) // 模糊
        if (e.key === '3') handleReview(5) // 会
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAnswer, loading, currentIndex, currentMode])

  const finishSession = async () => {
    const endTime = Date.now()
    const durationMinutes = Math.max(1, Math.round((endTime - startTimeRef.current) / 60000))
    await saveStudySession(durationMinutes, cardsReviewed)
    router.push(`/decks/${deckId}`)
  }

  const playAudio = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a Japanese voice
      const voices = window.speechSynthesis.getVoices();
      const jpVoice = voices.find(voice => voice.lang.includes('ja') || voice.lang.includes('JP'));
      
      if (jpVoice) {
        utterance.voice = jpVoice;
      } else {
        // Fallback if no specific Japanese voice is found
        utterance.lang = 'ja-JP';
      }
      
      utterance.rate = 0.9; // Slightly slower for learning
      
      // Add error handling
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        if (event.error === 'not-allowed') {
          alert("Please click anywhere on the page first to allow audio playback.");
        } else if (event.error === 'synthesis-unavailable') {
          alert("Your device or browser doesn't have a Japanese voice installed.");
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert("Your browser does not support text-to-speech.");
    }
  }

  // Ensure voices are loaded (some browsers load them asynchronously)
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Trigger initial load
      window.speechSynthesis.getVoices();
      // Chrome needs this event listener to reliably get voices on first load
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  if (currentIndex >= cards.length) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl">Session Complete!</h2>
        <p className="text-muted-foreground">You reviewed {cardsReviewed} cards.</p>
        <Button onClick={finishSession}>Save & Return</Button>
      </div>
    )
  }

  const card = cards[currentIndex]

  const handleReview = async (quality: number) => {
    if (loading) return;
    setLoading(true)
    
    // Save to database
    await submitReview(card.id, deckId, quality)
    
    if (quality < 3) {
      // If user got it wrong (quality 1 or 2), add this card back to the end of the queue
      // so they have to review it again in this same session
      cards.push(card);
    } else {
      // Only count as truly reviewed/completed if they got it right
      setCardsReviewed(prev => prev + 1)
    }
    
    setLoading(false)
    setCurrentIndex(prev => prev + 1)
  }

  const handleChoice = (selected: string) => {
    if (showAnswer) return;
    if (selected === card.meaning) {
      // Correct!
      setShowAnswer(true);
    } else {
      // Incorrect, reveal answer and force review 'Again'
      // We don't automatically trigger handleReview here to let the user read the correct answer first
      // They will have to click the "Again(1)" button, which will trigger the retry logic
      setShowAnswer(true);
    }
  }

  const handleSpellingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showAnswer) return;
    
    // Check against front (Kanji) or reading (Kana)
    const normalizedInput = spellingInput.trim();
    if (normalizedInput === card.front || (card.reading && normalizedInput === card.reading)) {
      setSpellingError(false);
      setShowAnswer(true);
    } else {
      setSpellingError(true);
      // Reveal answer after mistake
      setTimeout(() => setShowAnswer(true), 1000);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>Card {currentIndex + 1} of {cards.length}</span>
        <div className="space-x-4">
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as StudyMode)}
            className="bg-transparent border rounded p-1 text-xs"
          >
            <option value="random">Random Modes</option>
            <option value="flashcard">Flashcards Only</option>
            <option value="multiple-choice">Multiple Choice</option>
            <option value="spelling">Spelling</option>
          </select>
          <Button variant="ghost" size="sm" onClick={finishSession}>End Session Early</Button>
        </div>
      </div>

      <Card className={`min-h-[300px] flex flex-col justify-center items-center p-8 text-center transition-colors ${currentMode === 'flashcard' && !showAnswer ? 'border-primary/50' : ''}`}>
        <CardContent className="w-full space-y-6">
          
          {/* Card Front Content - Changes based on mode */}
          <div className="space-y-4">
            {currentMode === 'spelling' ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Type the Japanese reading or word for:</p>
                <h2 className="text-3xl font-semibold">{card.meaning}</h2>
              </div>
            ) : (
              <div className="space-y-2 relative inline-block">
                <h2 className="text-5xl font-bold">{card.front}</h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute -right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary rounded-full"
                  onClick={(e) => { e.stopPropagation(); playAudio(card.front); }}
                  title="Play audio"
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
                {/* Always show reading in flashcard or multiple-choice since spelling mode is handled in the if branch above */}
                {card.reading && (
                  <p className="text-xl text-muted-foreground">【{card.reading}】</p>
                )}
              </div>
            )}
          </div>

          {/* Interactive Elements before reveal */}
          {!showAnswer && currentMode === 'multiple-choice' && (
            <div className="grid grid-cols-1 gap-2 pt-8 w-full max-w-md mx-auto">
              {options.map((opt, i) => (
                <Button key={i} variant="outline" className="justify-start h-auto py-3 px-4 text-left" onClick={() => handleChoice(opt)}>
                  {opt}
                </Button>
              ))}
            </div>
          )}

          {!showAnswer && currentMode === 'spelling' && (
            <form onSubmit={handleSpellingSubmit} className="pt-8 w-full max-w-xs mx-auto space-y-2">
              <Input 
                autoFocus
                value={spellingInput}
                onChange={e => setSpellingInput(e.target.value)}
                placeholder="Type in Japanese..."
                className={`text-center text-lg ${spellingError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              <Button type="submit" className="w-full">Check</Button>
            </form>
          )}

          {/* Answer Reveal Section */}
          {showAnswer ? (
            <div className="space-y-4 pt-8 border-t w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4">
              {currentMode === 'spelling' && (
                <div className="mb-4">
                  <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
                    {card.front}
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); playAudio(card.front); }}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </h2>
                  {card.reading && <p className="text-xl text-muted-foreground">【{card.reading}】</p>}
                </div>
              )}
              <p className="text-2xl font-semibold">{card.meaning}</p>
              {card.part_of_speech && (
                <span className="inline-block bg-muted px-2 py-1 rounded text-xs">
                  {card.part_of_speech}
                </span>
              )}
              {card.example_sentence && (
                <div className="text-left bg-muted/30 p-4 rounded-lg">
                  <p className="mb-1 flex items-center justify-between">
                    <span>{card.example_sentence}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={(e) => { e.stopPropagation(); playAudio(card.example_sentence); }}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </p>
                  <p className="text-sm text-muted-foreground">{card.example_translation}</p>
                </div>
              )}
            </div>
          ) : (
            currentMode === 'flashcard' && (
              <div className="pt-8 text-muted-foreground animate-pulse">
                Press space or click the button below to reveal answer
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Answer Reveal & Navigation Section */}
      <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
        {showAnswer ? (
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button disabled={loading} variant="destructive" onClick={() => handleReview(1)} className="h-16 text-lg font-bold">
              不会
            </Button>
            <Button disabled={loading} variant="secondary" onClick={() => handleReview(3)} className="h-16 text-lg font-bold">
              模糊
            </Button>
            <Button disabled={loading} variant="default" className="bg-green-600 hover:bg-green-700 h-16 text-lg font-bold" onClick={() => handleReview(5)}>
              会
            </Button>
          </div>
        ) : currentMode === 'flashcard' ? (
          <Button onClick={() => setShowAnswer(true)} className="w-full h-14 text-lg">
            显示答案 (Show Answer)
          </Button>
        ) : null}

        {/* Navigation controls */}
        <div className="flex justify-between w-full pt-4 border-t border-muted">
          <Button 
            variant="ghost" 
            disabled={currentIndex === 0 || loading} 
            onClick={() => {
              setCurrentIndex(prev => Math.max(0, prev - 1));
              setShowAnswer(false);
            }}
          >
            &larr; 上一个 (Previous)
          </Button>
          <Button 
            variant="ghost" 
            disabled={loading}
            onClick={() => {
              setCurrentIndex(prev => prev + 1);
              setShowAnswer(false);
            }}
          >
            跳过 (Skip) &rarr;
          </Button>
        </div>
      </div>
    </div>
  )
}
