/**
 * The ready pieces a custom page (src/extensions/post-pages/) builds with,
 * so the things that never move stay the site's own: its viewer for
 * pictures, its images, and the standard drawing of any block (the body
 * text, a gallery, a quote) for the parts a page leaves as they are.
 * Buttons, links and tokens come from Parabola.
 */
export { LightboxButton, LightboxGroup } from "./lightbox-group";
export { MediaImage } from "@/components/shared/media-image";
export { ArticleContent as StandardBlocks } from "@/components/site/article-content";
