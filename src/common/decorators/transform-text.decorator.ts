import { Transform } from 'class-transformer';

export const TransformText = (): PropertyDecorator =>
  Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/(?=[\W])[ʰ-˿̀-ͯ]{1,}/gmu, '').trim()
      : value
  );
