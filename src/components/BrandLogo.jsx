/**
 * Wordmark: "Tube" in white, "Scribe" in lavender→violet gradient (matches brand header).
 */
export default function BrandLogo({ size = 'md', showTagline = false, className = '', onClick, as: Tag = 'div' }) {
  const scale =
    size === 'sm'
      ? { word: 'text-base', tag: 'text-[9px] tracking-[0.28em]' }
      : size === 'lg'
        ? { word: 'text-2xl md:text-3xl', tag: 'text-xs tracking-[0.35em]' }
        : { word: 'text-xl', tag: 'text-[10px] tracking-[0.32em]' };

  const Wrapper = onClick ? 'button' : Tag;
  const wrapperProps = onClick
    ? { type: 'button', onClick, className: `text-left transition-opacity hover:opacity-90 ${className}` }
    : { className };

  return (
    <Wrapper {...wrapperProps}>
      <div className={`font-bold tracking-tight ${scale.word}`}>
        <span className="text-on-surface">Tube</span>
        <span className="text-gradient-scribe">Scribe</span>
      </div>
      {showTagline && (
        <p
          className={`mt-1.5 font-medium uppercase text-primary-fixed-dim/75 ${scale.tag}`}
        >
          Transcribe. Summarize. Learn.
        </p>
      )}
    </Wrapper>
  );
}
