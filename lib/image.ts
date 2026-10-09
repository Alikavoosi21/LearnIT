import sharp from 'sharp';
import { ImageAttachment, MAX_IMAGE_BYTES, type TutorImage } from './contracts';
export async function validateImage(image:TutorImage):Promise<void> {
  ImageAttachment.parse(image);
  const [header,payload]=image.dataUrl.split(',');
  const bytes=Buffer.from(payload,'base64');
  if(bytes.length>MAX_IMAGE_BYTES) throw new Error('حجم عکس باید حداکثر ۳ مگابایت باشد.');
  if(bytes.toString('base64')!==payload) throw new Error('داده عکس معتبر نیست.');
  const expected=header.includes('jpeg')?'jpeg':header.includes('png')?'png':'webp';
  let metadata;
  try {metadata=await sharp(bytes,{limitInputPixels:16_000_000}).metadata();}
  catch {throw new Error('عکس معتبر نیست یا ابعاد آن بیش از حد بزرگ است.');}
  if(metadata.format!==expected||!metadata.width||!metadata.height||(metadata.pages??1)>1||metadata.width*metadata.height>16_000_000) throw new Error('یک عکس ثابت PNG، JPEG یا WebP با حداکثر ۱۶ میلیون پیکسل انتخاب کنید.');
}
