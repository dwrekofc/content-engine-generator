# Content Schema

## Source
JTBD 6: Dummy Content for Pipeline Testing

## Purpose
Defines the JSON content format that fills a template's field slots with actual values. Content JSON mirrors the template's structure, providing text, links, and media references for each field. In Phase 1, content is hand-crafted dummy data to exercise the rendering pipeline.

## Requirements
- Content JSON references a template (by ID or filename) and a theme (by ID or filename)
- Content structure mirrors the template hierarchy: Document → Pages/Slides → Sections → [Sub Sections] → Cards → Field values
- Each field value maps to a field slot ID defined in the template
- Support values for all 7 field types: Title (string), Subtitle (string), Paragraph (string/rich text), Button (text + URL), Featured Content (media URL/path), Featured Content Caption (string), Background (color/gradient/image URL)
- Field values that are marked optional in the template can be omitted from the content JSON
- Field values that are marked required in the template must be present (validation error if missing)
- Dummy content should respect field constraints for structural realism (e.g., titles are short strings, paragraphs are longer prose, button text is action-oriented) [inferred]

## Constraints
- Format is JSON
- Content JSON contains NO layout or styling information — structure comes from the template, styling from the theme
- Content must be validatable against its referenced template schema (field IDs must match, required fields must be present)
- Phase 1 content is hand-crafted dummy JSON — no AI generation system, no content authoring UI

## Acceptance Criteria
1. A TypeScript type definition exists for the content schema
2. A JSON Schema (or Zod schema) exists for content validation
3. A validation function checks content JSON against its referenced template (required fields present, field IDs match, no orphan values)
4. At least one sample content JSON file exists with realistic dummy data for a sample template
5. The HTML preview can load and render a content JSON file
6. The PPTX generator can consume a content JSON file
