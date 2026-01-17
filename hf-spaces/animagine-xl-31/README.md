---
title: Animagine XL 3.1
emoji: 🎨
colorFrom: pink
colorTo: purple
sdk: gradio
sdk_version: 5.34.0
app_file: app.py
pinned: false
license: other
short_description: High-quality anime image generation with Animagine XL 3.1
---

# Animagine XL 3.1 - Anime Image Generation

Generate high-quality anime images using Animagine XL 3.1.

## Features
- High-quality anime style generation
- Danbooru tag support
- Customizable resolution (512-1536)
- Adjustable guidance scale and steps

## API Usage

```python
from gradio_client import Client

client = Client("sayasaya11/Animagine-XL-31")
result = client.predict(
    prompt="1girl, solo, blue hair, blue eyes, smile",
    negative_prompt="lowres, bad anatomy",
    seed=0,
    randomize_seed=True,
    width=1024,
    height=1024,
    guidance_scale=7,
    num_inference_steps=28,
    api_name="/generate"
)
```

## License
This model uses the Fair AI Public License 1.0-SD.
