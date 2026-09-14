# PowerPoint Presentation (.pptx) Widescreen Strategy Renderer
from __future__ import annotations

import os
import re
from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

from .base import Renderer
from ..schemas import PptxSpec, SlideSpec, DocumentResult, DocType


def _add_formatted_bullet(
    text_frame,
    text: str,
    font_name: str,
    body_size: int,
    muted_color: RGBColor,
    dark_color: RGBColor,
    is_first: bool = False,
) -> None:
    """Adds a formatted bullet run with bold headers when available."""
    p = text_frame.paragraphs[0] if is_first else text_frame.add_paragraph()
    p.space_after = Pt(8)
    clean_text = text.lstrip("-•* \t").strip()

    # Match **Title**: Description or Title: Description (with title <= 35 chars)
    m_bold = re.match(r"^\*\*(.*?)\*\*:?\s*(.*)$", clean_text)
    if m_bold:
        header, desc = m_bold.group(1).strip(), m_bold.group(2).strip()
        r_bullet = p.add_run()
        r_bullet.text = "▪  "
        r_bullet.font.name = font_name
        r_bullet.font.size = Pt(body_size)
        r_bullet.font.bold = True
        r_bullet.font.color.rgb = dark_color

        r_hdr = p.add_run()
        r_hdr.text = f"{header}: "
        r_hdr.font.name = font_name
        r_hdr.font.size = Pt(body_size)
        r_hdr.font.bold = True
        r_hdr.font.color.rgb = dark_color

        if desc:
            r_desc = p.add_run()
            r_desc.text = desc
            r_desc.font.name = font_name
            r_desc.font.size = Pt(body_size)
            r_desc.font.bold = False
            r_desc.font.color.rgb = muted_color
    else:
        colon_idx = clean_text.find(":")
        if 0 < colon_idx < 35 and not clean_text[:colon_idx].startswith("http"):
            header = clean_text[:colon_idx].strip()
            desc = clean_text[colon_idx + 1:].strip()
            r_bullet = p.add_run()
            r_bullet.text = "▪  "
            r_bullet.font.name = font_name
            r_bullet.font.size = Pt(body_size)
            r_bullet.font.bold = True
            r_bullet.font.color.rgb = dark_color

            r_hdr = p.add_run()
            r_hdr.text = f"{header}: "
            r_hdr.font.name = font_name
            r_hdr.font.size = Pt(body_size)
            r_hdr.font.bold = True
            r_hdr.font.color.rgb = dark_color

            if desc:
                r_desc = p.add_run()
                r_desc.text = desc
                r_desc.font.name = font_name
                r_desc.font.size = Pt(body_size)
                r_desc.font.bold = False
                r_desc.font.color.rgb = muted_color
        else:
            r = p.add_run()
            r.text = f"•  {clean_text}"
            r.font.name = font_name
            r.font.size = Pt(body_size)
            r.font.color.rgb = muted_color


class PptxRenderer(Renderer):

    def render(self, spec: PptxSpec, output_path: Path) -> DocumentResult:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)

        self._title_slide(prs, spec.title, spec.subtitle or "")
        total_slides = len(spec.slides)
        for idx, slide in enumerate(spec.slides, 1):
            self._content_slide(prs, slide, idx, total_slides)

        prs.save(str(output_path))

        return DocumentResult(
            filename=output_path.name,
            path=str(output_path),
            doc_type=DocType.PPTX,
            size_bytes=os.path.getsize(output_path),
        )

    def _title_slide(self, prs: Presentation, title: str, subtitle: str) -> None:
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = RGBColor(*self.theme.rgb_dark)
        bg.line.fill.background()

        # Top decorative accent bar
        accent = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(1.7), Inches(0.8), Pt(5))
        accent.fill.solid()
        accent.fill.fore_color.rgb = RGBColor(*self.theme.rgb_orange)
        accent.line.fill.background()

        # Category Tag
        tag_box = slide.shapes.add_textbox(Inches(1.2), Inches(1.9), Inches(10.9), Inches(0.4))
        tf_tag = tag_box.text_frame
        tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = "SOVEREIGN ENGINEERING REPORT // EXECUTIVE BRIEFING"
        p_tag.font.name = self.theme.font_family
        p_tag.font.bold = True
        p_tag.font.size = Pt(11)
        p_tag.font.color.rgb = RGBColor(*self.theme.rgb_orange)

        box = slide.shapes.add_textbox(Inches(1.2), Inches(2.4), Inches(10.9), Inches(3.2))
        tf = box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p_t = tf.paragraphs[0]
        p_t.text = title.upper()
        p_t.font.name = self.theme.font_family
        p_t.font.bold = True
        p_t.font.size = Pt(self.theme.title_size)
        p_t.font.color.rgb = RGBColor(*self.theme.rgb_soft_bg)

        if subtitle:
            p_s = tf.add_paragraph()
            p_s.text = subtitle
            p_s.font.name = self.theme.font_family
            p_s.font.size = Pt(18)
            p_s.font.color.rgb = RGBColor(*self.theme.rgb_orange)
            p_s.space_before = Pt(8)

        # Meta footer
        meta_box = slide.shapes.add_textbox(Inches(1.2), Inches(6.5), Inches(10.9), Inches(0.4))
        tf_meta = meta_box.text_frame
        tf_meta.margin_left = tf_meta.margin_top = tf_meta.margin_right = tf_meta.margin_bottom = 0
        p_m = tf_meta.paragraphs[0]
        p_m.text = f"{self.theme.org_title}  •  {self.theme.confidential_tag}"
        p_m.font.name = self.theme.font_family
        p_m.font.size = Pt(10)
        p_m.font.color.rgb = RGBColor(148, 163, 184)

    def _content_slide(
        self,
        prs: Presentation,
        slide_spec: SlideSpec | dict,
        slide_idx: int = 1,
        total_slides: int = 1,
    ) -> None:
        title = getattr(slide_spec, "title", None) or (slide_spec.get("title") if isinstance(slide_spec, dict) else "Technical Evaluation")
        subtitle = getattr(slide_spec, "subtitle", None) or (slide_spec.get("subtitle") if isinstance(slide_spec, dict) else None)
        definition = getattr(slide_spec, "definition", None) or (slide_spec.get("definition") if isinstance(slide_spec, dict) else None)
        explanation = getattr(slide_spec, "explanation", None) or (slide_spec.get("explanation") if isinstance(slide_spec, dict) else None)
        bullets_input = getattr(slide_spec, "bullets", None) or (slide_spec.get("bullets") if isinstance(slide_spec, dict) else [])
        notes = getattr(slide_spec, "notes", None) or (slide_spec.get("notes") if isinstance(slide_spec, dict) else None)

        if isinstance(bullets_input, str):
            raw_bullets = [b.strip() for b in bullets_input.split("\n") if b.strip()]
        else:
            raw_bullets = list(bullets_input or [])

        # Auto-extract definition and explanation from bullets if not explicitly populated
        clean_bullets = []
        for b in raw_bullets:
            b_str = str(b).lstrip("-•* \t").strip()
            if not b_str:
                continue
            if not definition and re.match(r"^(?:definition|concept|statutory reference|standard reference)\s*:\s*", b_str, re.IGNORECASE):
                definition = re.sub(r"^(?:definition|concept|statutory reference|standard reference)\s*:\s*", "", b_str, flags=re.IGNORECASE).strip()
            elif not explanation and re.match(r"^(?:explanation|analysis|technical narrative|overview|context)\s*:\s*", b_str, re.IGNORECASE):
                explanation = re.sub(r"^(?:explanation|analysis|technical narrative|overview|context)\s*:\s*", "", b_str, flags=re.IGNORECASE).strip()
            else:
                clean_bullets.append(b_str)

        slide = prs.slides.add_slide(prs.slide_layouts[6])

        # Solid background
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = RGBColor(255, 255, 255)
        bg.line.fill.background()

        # Top tracking badge (if subtitle provided)
        y_title = Inches(0.65)
        if subtitle:
            badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.3))
            tf_b = badge_box.text_frame
            tf_b.margin_left = tf_b.margin_top = tf_b.margin_right = tf_b.margin_bottom = 0
            p_b = tf_b.paragraphs[0]
            p_b.text = subtitle.upper()
            p_b.font.name = self.theme.font_family
            p_b.font.bold = True
            p_b.font.size = Pt(10)
            p_b.font.color.rgb = RGBColor(*self.theme.rgb_orange)
            y_title = Inches(0.7)

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), y_title, Inches(11.733), Inches(0.65))
        tf_t = title_box.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_top = tf_t.margin_right = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        p_t.text = title
        p_t.font.name = self.theme.font_family
        p_t.font.bold = True
        p_t.font.size = Pt(22)
        p_t.font.color.rgb = RGBColor(*self.theme.rgb_dark)

        # Subtle decorative divider line
        sep = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.42), Inches(11.733), Pt(1.5))
        sep.fill.solid()
        sep.fill.fore_color.rgb = RGBColor(226, 232, 240)
        sep.line.fill.background()

        # Layout Dispatch
        has_narrative = bool(definition or explanation)
        has_bullets = bool(clean_bullets)

        if has_narrative and has_bullets:
            # Two-column layout: Narrative (Definition + Explanation) on left, Key Takeaways on right
            left_x = Inches(0.8)
            left_w = Inches(5.65)
            right_x = Inches(6.85)
            right_w = Inches(5.68)

            # Left column: Definition card (if present)
            curr_y = Inches(1.6)
            if definition:
                def_h = Inches(1.8) if explanation else Inches(5.0)
                def_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_x, curr_y, left_w, def_h)
                def_card.fill.solid()
                def_card.fill.fore_color.rgb = RGBColor(241, 245, 249)
                def_card.line.color.rgb = RGBColor(203, 213, 225)
                def_card.line.width = Pt(1)

                tf_d = def_card.text_frame
                tf_d.word_wrap = True
                tf_d.margin_left = tf_d.margin_right = Inches(0.25)
                tf_d.margin_top = tf_d.margin_bottom = Inches(0.2)
                p_dh = tf_d.paragraphs[0]
                p_dh.text = "DEFINITION & REGULATORY CONTEXT"
                p_dh.font.name = self.theme.font_family
                p_dh.font.bold = True
                p_dh.font.size = Pt(10)
                p_dh.font.color.rgb = RGBColor(*self.theme.rgb_orange)
                p_dh.space_after = Pt(4)

                p_db = tf_d.add_paragraph()
                p_db.text = definition
                p_db.font.name = self.theme.font_family
                p_db.font.size = Pt(11.5)
                p_db.font.color.rgb = RGBColor(30, 41, 59)
                curr_y += def_h + Inches(0.18)

            # Left column: Explanation card (if present)
            if explanation:
                exp_h = (Inches(6.6) - curr_y)
                exp_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_x, curr_y, left_w, exp_h)
                exp_card.fill.solid()
                exp_card.fill.fore_color.rgb = RGBColor(255, 255, 255)
                exp_card.line.color.rgb = RGBColor(226, 232, 240)
                exp_card.line.width = Pt(1)

                tf_e = exp_card.text_frame
                tf_e.word_wrap = True
                tf_e.margin_left = tf_e.margin_right = Inches(0.25)
                tf_e.margin_top = tf_e.margin_bottom = Inches(0.2)
                p_eh = tf_e.paragraphs[0]
                p_eh.text = "TECHNICAL ANALYSIS & EXPLANATION"
                p_eh.font.name = self.theme.font_family
                p_eh.font.bold = True
                p_eh.font.size = Pt(10)
                p_eh.font.color.rgb = RGBColor(*self.theme.rgb_dark)
                p_eh.space_after = Pt(6)

                for chunk in explanation.split("\n\n"):
                    if chunk.strip():
                        p_eb = tf_e.add_paragraph()
                        p_eb.text = chunk.strip()
                        p_eb.font.name = self.theme.font_family
                        p_eb.font.size = Pt(11.5)
                        p_eb.font.color.rgb = RGBColor(51, 65, 85)
                        p_eb.space_after = Pt(4)

            # Right column: Key Points & Findings
            find_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, right_x, Inches(1.6), right_w, Inches(5.0))
            find_card.fill.solid()
            find_card.fill.fore_color.rgb = RGBColor(255, 255, 255)
            find_card.line.color.rgb = RGBColor(226, 232, 240)
            find_card.line.width = Pt(1)

            tf_f = find_card.text_frame
            tf_f.word_wrap = True
            tf_f.margin_left = tf_f.margin_right = Inches(0.25)
            tf_f.margin_top = tf_f.margin_bottom = Inches(0.2)
            p_fh = tf_f.paragraphs[0]
            p_fh.text = "KEY SPECIFICATIONS & ACTIONABLE TAKEAWAYS"
            p_fh.font.name = self.theme.font_family
            p_fh.font.bold = True
            p_fh.font.size = Pt(10)
            p_fh.font.color.rgb = RGBColor(*self.theme.rgb_dark)
            p_fh.space_after = Pt(8)

            for b in clean_bullets:
                _add_formatted_bullet(
                    tf_f, b, self.theme.font_family, 12,
                    RGBColor(*self.theme.rgb_muted), RGBColor(*self.theme.rgb_dark)
                )

        elif has_narrative and not has_bullets:
            # Stacked full-width narrative cards
            full_w = Inches(11.733)
            curr_y = Inches(1.6)
            if definition:
                def_h = Inches(2.0) if explanation else Inches(5.0)
                def_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), curr_y, full_w, def_h)
                def_card.fill.solid()
                def_card.fill.fore_color.rgb = RGBColor(241, 245, 249)
                def_card.line.color.rgb = RGBColor(203, 213, 225)
                def_card.line.width = Pt(1)

                tf_d = def_card.text_frame
                tf_d.word_wrap = True
                tf_d.margin_left = tf_d.margin_right = Inches(0.3)
                tf_d.margin_top = tf_d.margin_bottom = Inches(0.2)
                p_dh = tf_d.paragraphs[0]
                p_dh.text = "DEFINITION & REGULATORY CONTEXT"
                p_dh.font.name = self.theme.font_family
                p_dh.font.bold = True
                p_dh.font.size = Pt(11)
                p_dh.font.color.rgb = RGBColor(*self.theme.rgb_orange)
                p_dh.space_after = Pt(4)

                p_db = tf_d.add_paragraph()
                p_db.text = definition
                p_db.font.name = self.theme.font_family
                p_db.font.size = Pt(12)
                p_db.font.color.rgb = RGBColor(30, 41, 59)
                curr_y += def_h + Inches(0.2)

            if explanation:
                exp_h = (Inches(6.6) - curr_y)
                exp_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), curr_y, full_w, exp_h)
                exp_card.fill.solid()
                exp_card.fill.fore_color.rgb = RGBColor(255, 255, 255)
                exp_card.line.color.rgb = RGBColor(226, 232, 240)
                exp_card.line.width = Pt(1)

                tf_e = exp_card.text_frame
                tf_e.word_wrap = True
                tf_e.margin_left = tf_e.margin_right = Inches(0.3)
                tf_e.margin_top = tf_e.margin_bottom = Inches(0.2)
                p_eh = tf_e.paragraphs[0]
                p_eh.text = "DETAILED TECHNICAL ANALYSIS & EXPLANATION"
                p_eh.font.name = self.theme.font_family
                p_eh.font.bold = True
                p_eh.font.size = Pt(11)
                p_eh.font.color.rgb = RGBColor(*self.theme.rgb_dark)
                p_eh.space_after = Pt(6)

                for chunk in explanation.split("\n\n"):
                    if chunk.strip():
                        p_eb = tf_e.add_paragraph()
                        p_eb.text = chunk.strip()
                        p_eb.font.name = self.theme.font_family
                        p_eb.font.size = Pt(12)
                        p_eb.font.color.rgb = RGBColor(51, 65, 85)
                        p_eb.space_after = Pt(6)

        else:
            # Bullets only: Render in balanced 2 columns if > 3 bullets, else wide card
            full_w = Inches(11.733)
            if len(clean_bullets) > 3:
                mid = (len(clean_bullets) + 1) // 2
                col1_bullets = clean_bullets[:mid]
                col2_bullets = clean_bullets[mid:]

                left_x = Inches(0.8)
                left_w = Inches(5.65)
                right_x = Inches(6.85)
                right_w = Inches(5.68)

                for cx, cw, b_list, hdr_title in [
                    (left_x, left_w, col1_bullets, "TECHNICAL EVALUATION & CRITERIA"),
                    (right_x, right_w, col2_bullets, "KEY SPECIFICATIONS & TAKEAWAYS"),
                ]:
                    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, cx, Inches(1.6), cw, Inches(5.0))
                    card.fill.solid()
                    card.fill.fore_color.rgb = RGBColor(255, 255, 255)
                    card.line.color.rgb = RGBColor(226, 232, 240)
                    card.line.width = Pt(1)

                    tf = card.text_frame
                    tf.word_wrap = True
                    tf.margin_left = tf.margin_right = Inches(0.25)
                    tf.margin_top = tf.margin_bottom = Inches(0.2)
                    p_h = tf.paragraphs[0]
                    p_h.text = hdr_title
                    p_h.font.name = self.theme.font_family
                    p_h.font.bold = True
                    p_h.font.size = Pt(10)
                    p_h.font.color.rgb = RGBColor(*self.theme.rgb_dark)
                    p_h.space_after = Pt(8)

                    for b in b_list:
                        _add_formatted_bullet(
                            tf, b, self.theme.font_family, 12,
                            RGBColor(*self.theme.rgb_muted), RGBColor(*self.theme.rgb_dark)
                        )
            else:
                card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.6), full_w, Inches(5.0))
                card.fill.solid()
                card.fill.fore_color.rgb = RGBColor(255, 255, 255)
                card.line.color.rgb = RGBColor(226, 232, 240)
                card.line.width = Pt(1)

                tf = card.text_frame
                tf.word_wrap = True
                tf.margin_left = tf.margin_right = Inches(0.35)
                tf.margin_top = tf.margin_bottom = Inches(0.3)
                p_h = tf.paragraphs[0]
                p_h.text = "EXECUTIVE SPECIFICATIONS & FINDINGS"
                p_h.font.name = self.theme.font_family
                p_h.font.bold = True
                p_h.font.size = Pt(11)
                p_h.font.color.rgb = RGBColor(*self.theme.rgb_dark)
                p_h.space_after = Pt(10)

                for b in clean_bullets:
                    _add_formatted_bullet(
                        tf, b, self.theme.font_family, 13,
                        RGBColor(*self.theme.rgb_muted), RGBColor(*self.theme.rgb_dark)
                    )

        # Footer
        foot_box = slide.shapes.add_textbox(Inches(0.8), Inches(6.85), Inches(11.733), Inches(0.35))
        tf_foot = foot_box.text_frame
        tf_foot.margin_left = tf_foot.margin_top = tf_foot.margin_right = tf_foot.margin_bottom = 0
        p_foot = tf_foot.paragraphs[0]
        p_foot.text = f"{self.theme.org_title}  •  {self.theme.confidential_tag}     |     Slide {slide_idx} of {total_slides}"
        p_foot.font.name = self.theme.font_family
        p_foot.font.size = Pt(9)
        p_foot.font.color.rgb = RGBColor(148, 163, 184)

        # Speaker notes
        if notes:
            notes_slide = slide.notes_slide
            text_frame = notes_slide.notes_text_frame
            text_frame.text = str(notes)

