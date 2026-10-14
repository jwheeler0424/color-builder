export const paletteAddButtonBaseClassName =
  "isolate [transition:background-color_240ms_cubic-bezier(0.2,0.8,0.2,1),border-color_240ms_cubic-bezier(0.2,0.8,0.2,1),color_240ms_cubic-bezier(0.2,0.8,0.2,1),box-shadow_300ms_cubic-bezier(0.2,0.8,0.2,1),translate_300ms_cubic-bezier(0.2,0.8,0.2,1),scale_240ms_cubic-bezier(0.2,0.8,0.2,1)] before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-primary before:opacity-0 before:content-[''] before:[transition:opacity_240ms_cubic-bezier(0.2,0.8,0.2,1)] [&>*]:relative [&>*]:z-[1] motion-reduce:transition-none motion-reduce:before:transition-none";

export const paletteAddIconClassName =
  '[transition:background-color_240ms_cubic-bezier(0.2,0.8,0.2,1),color_240ms_cubic-bezier(0.2,0.8,0.2,1),transform_320ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none';

export const paletteAddWideButtonClassName = `${paletteAddButtonBaseClassName} relative [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary [@media(hover:hover)_and_(pointer:fine)]:hover:bg-card [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_8px_18px_-12px_rgb(0_0_0/35%)] [@media(hover:hover)_and_(pointer:fine)]:hover:before:opacity-[0.14] [@media(hover:hover)_and_(pointer:fine)]:hover:[&_.palette-add-icon]:rotate-[90deg] [@media(hover:hover)_and_(pointer:fine)]:hover:[&_.palette-add-icon]:scale-[1.08]`;

export const paletteAddSlotButtonClassName = `${paletteAddButtonBaseClassName} absolute bg-[rgb(0_0_0/55%)] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[rgb(0_0_0/80%)]`;
