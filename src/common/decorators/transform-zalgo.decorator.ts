import { Transform } from 'class-transformer';

export const TransformZalgo = (): PropertyDecorator =>
  Transform(({ value }) =>
    typeof value === 'string'
      ? value.replace(/(?=[\W])[ʰ-˿̀-ͯ]{1,}/gmu, '')
      : value
  );
