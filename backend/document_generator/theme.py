# Theme Configuration for Office Deliverable Renderers
"""
Style config, injected — not a global import like the old THEME dict.
Swap this per-brand/per-tenant without touching renderer code.
"""
from dataclasses import dataclass
from ..config import ORGANIZATION_NAME, CONFIDENTIAL_TAG


@dataclass(frozen=True)
class Theme:
    font_family: str = "Calibri"
    rgb_dark: tuple[int, int, int] = (17, 24, 39)
    rgb_orange: tuple[int, int, int] = (234, 88, 12)
    rgb_soft_bg: tuple[int, int, int] = (255, 255, 255)
    rgb_muted: tuple[int, int, int] = (55, 65, 81)
    title_size: int = 40
    header_size: int = 28
    body_size: int = 18
    org_title: str = ORGANIZATION_NAME
    confidential_tag: str = CONFIDENTIAL_TAG


DEFAULT_THEME = Theme()
