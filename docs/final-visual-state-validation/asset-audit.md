# Country asset audit

Seven staged files arrived under generated filenames rather than country names. Each was inspected and copied byte for byte into the runtime folder. All seven are 941×1672 PNGs, suitable for the 440px mobile frame at approximately 2× density. No art was stretched or regenerated.

| Country | Canonical runtime source | Dimensions / ratio | Usage |
|---|---|---|---|
| cambodia | `src/assets/experience/cambodia-background.webp` | 880×1913 / 0.460 | Collection, Mystery Box |
| colombia | `src/assets/experience/country-backgrounds/colombia.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |
| united-states | `src/assets/experience/country-backgrounds/united-states.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |
| japan | `src/assets/experience/country-backgrounds/japan.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |
| italy | `src/assets/experience/country-backgrounds/italy.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |
| india | `src/assets/experience/country-backgrounds/india.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |
| china | `src/assets/experience/country-backgrounds/china.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |
| france | `src/assets/experience/country-backgrounds/france.png` | 941×1672 / 0.563 | Collection, Mystery Box, collectible detail, overview card, center 22% crop |

## Staging mapping

| Country | Source in Background_Images |
|---|---|
| colombia | `ChatGPT Image Oct 5, 2026, 02_07_35 PM-1.png` |
| united-states | `ChatGPT Image Oct 5, 2026, 02_07_36 PM-2.png` |
| japan | `ChatGPT Image Oct 5, 2026, 02_07_39 PM-3.png` |
| italy | `ChatGPT Image Oct 5, 2026, 02_07_41 PM-4.png` |
| india | `ChatGPT Image Oct 5, 2026, 02_07_42 PM-5.png` |
| china | `ChatGPT Image Oct 5, 2026, 02_07_43 PM-6.png` |
| france | `ChatGPT Image Oct 5, 2026, 02_07_44 PM-7.png` |

## Suitability and fallback

- Cambodia Collection/Mystery Box art remains `cambodia-background.webp` (880×1913), and its overview remains `country-cambodia.webp` (500×375). Its separate collectible-detail `detail-background.webp` (880×1913) is also unchanged.
- All seven new masters serve Collection and Mystery Box pages. Non-Cambodia collectible details also inherit the portrait. Overview cards use `object-fit: cover; object-position: center 22%` on the same master, with no completion-dependent opacity. Browser review of every thumbnail crop remains outstanding; the original related horizontal crops are preserved if a different crop is needed.
- The original eight country-card WebPs are 500×375, ratio 4:3: suitable for overview cards, unsuitable for full vertical screens. Seven have been retired from the country definitions, without deleting or altering their bytes.
- No currently defined country is missing portrait art. Any future unsupported country uses a warm gradient and subtle dots; its thumbnail is never promoted into a full-screen background.
- Portrait background sizing is `100% auto` at the top, preserving proportions. A quiet foundation continues below the image rather than stretching it. Cambodia keeps opacity 0.8; new countries use 0.625 (raised 25% from the initial 0.5 treatment in this pass). Their additional warm fade is reduced by 25%. Overview art has full opacity, plus modest contrast/saturation; progress changes only metadata and dots.

The JSON audit includes SHA-256 values, staging/runtime equivalence and retained legacy crop suitability.
