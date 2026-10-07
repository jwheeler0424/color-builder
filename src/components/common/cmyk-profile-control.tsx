import { Upload, X } from 'lucide-react';
import { useRef } from 'react';

import { clearCmykProfile, loadCmykProfile, useCmykProfile } from '@/hooks/use-cmyk-profile';

export function CmykProfileControl() {
  const profile = useCmykProfile();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className='flex min-w-0 flex-col gap-2'>
      <input
        ref={input}
        type='file'
        accept='.icc,.icm'
        aria-label='CMYK ICC profile'
        className='hidden'
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void loadCmykProfile(file);
          event.target.value = '';
        }}
      />
      <div className='flex min-w-0 items-center gap-2'>
        <button
          type='button'
          disabled={profile.loading}
          className='inline-flex items-center gap-2 rounded border border-border bg-secondary px-2 py-1.5 text-xs'
          onClick={() => input.current?.click()}>
          <Upload className='size-3.5' />
          {profile.loading
            ? 'Loading profile...'
            : profile.converter
              ? 'Replace ICC profile'
              : 'Load ICC profile'}
        </button>
        {profile.converter && (
          <button
            type='button'
            title='Remove ICC profile'
            aria-label='Remove ICC profile'
            className='shrink-0 rounded p-1.5'
            onClick={clearCmykProfile}>
            <X className='size-3.5' />
          </button>
        )}
      </div>
      {profile.converter && (
        <span className='truncate text-xs text-muted-foreground' title={profile.converter.name}>
          {profile.converter.name}
        </span>
      )}
      {profile.error && (
        <p role='alert' className='text-xs text-destructive'>
          {profile.error}
        </p>
      )}
    </div>
  );
}
