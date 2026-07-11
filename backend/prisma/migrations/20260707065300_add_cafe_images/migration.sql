ALTER TABLE "cafes"
ADD COLUMN "cover_image_url" TEXT,
ADD COLUMN "gallery_images" JSONB NOT NULL DEFAULT '[]';
