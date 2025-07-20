'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Smile, Calendar, MapPin } from 'lucide-react';

interface TweetComposerProps {
  onTweet: (content: string) => void;
}

export function TweetComposer({ onTweet }: TweetComposerProps) {
  const [content, setContent] = useState('');
  const maxLength = 280;

  const handleSubmit = () => {
    if (content.trim() && content.length <= maxLength) {
      onTweet(content.trim());
      setContent('');
    }
  };

  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const isEmpty = content.trim().length === 0;

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex space-x-3">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex-shrink-0"></div>
        <div className="flex-1">
          <Textarea
            placeholder="¿Qué está pasando?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="border-none resize-none text-xl placeholder:text-gray-500 focus-visible:ring-0 p-0"
            rows={3}
          />
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex space-x-4">
              <button className="p-2 hover:bg-blue-50 rounded-full transition-colors">
                <Image className="w-5 h-5 text-blue-500" />
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-full transition-colors">
                <Smile className="w-5 h-5 text-blue-500" />
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-full transition-colors">
                <Calendar className="w-5 h-5 text-blue-500" />
              </button>
              <button className="p-2 hover:bg-blue-50 rounded-full transition-colors">
                <MapPin className="w-5 h-5 text-blue-500" />
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`text-sm ${isOverLimit ? 'text-red-500' : remainingChars <= 20 ? 'text-yellow-500' : 'text-gray-500'}`}>
                {remainingChars < 0 ? remainingChars : remainingChars <= 20 ? remainingChars : ''}
              </span>
              <Button
                onClick={handleSubmit}
                disabled={isEmpty || isOverLimit}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 py-2 font-semibold disabled:opacity-50"
              >
                Twittear
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}