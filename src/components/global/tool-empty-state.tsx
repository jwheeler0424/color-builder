export function ToolEmptyState({
  className,
  title,
  message,
}: {
  className: string;
  title?: string;
  message: string;
}) {
  return (
    <div className={className}>
      {title && (
        <div className='mb-5'>
          <h2>{title}</h2>
        </div>
      )}
      <p className='text-xs text-muted-foreground'>{message}</p>
    </div>
  );
}
