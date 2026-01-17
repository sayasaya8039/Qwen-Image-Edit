---
title: SDXL Turbo
emoji: ⚡
colorFrom: purple
colorTo: blue
sdk: gradio
sdk_version: 5.34.0
app_file: app.py
pinned: false
license: other
short_description: Ultra-fast text-to-image generation with SDXL Turbo
---

# SDXL Turbo - Ultra Fast Image Generation

Generate high-quality 512x512 images in just 1-4 steps using SDXL Turbo.

## Features
- Single-step generation capable
- Real-time image synthesis
- 512x512 resolution output

## API Usage

```python
from gradio_client import Client

client = Client("sayasaya11/SDXL-Turbo")
result = client.predict(
    prompt="a beautiful sunset over mountains",
    seed=42,
    randomize_seed=True,
    steps=1,
    api_name="/generate"
)
```

## License
This model uses the Stability AI Community License (non-commercial).
