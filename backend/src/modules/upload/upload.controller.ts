import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../common/response';
import * as uploadService from './upload.service';
import type { CreateCloudinarySignatureBody, RegistrationUploadSignatureBody } from './upload.validator';

export function createCloudinarySignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const data = uploadService.createCloudinaryUploadSignature(
      req.body as CreateCloudinarySignatureBody,
    );
    sendSuccess(res, data, 'Cloudinary upload signature created');
  } catch (err) {
    next(err);
  }
}

export function createRegistrationCloudinarySignature(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const body = req.body as RegistrationUploadSignatureBody;
    const data = uploadService.createRegistrationCloudinaryUploadSignature(body.docType);
    sendSuccess(res, data, 'Cloudinary upload signature created');
  } catch (err) {
    next(err);
  }
}
