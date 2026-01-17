// WebGPU Gaussian Blur - Vertical Pass
// Compute Shader for vertical blur using separable convolution

@group(0) @binding(0) var<storage, read> inputImage: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> imageSize: vec2<u32>;
@group(0) @binding(3) var<storage, read> kernel: array<f32>;
@group(0) @binding(4) var<uniform> kernelSize: u32;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) globalId: vec3<u32>) {
    let x = globalId.x;
    let y = globalId.y;
    
    // Bounds check
    if (x >= imageSize.x || y >= imageSize.y) {
        return;
    }
    
    var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
    var intensity = 0.0;
    
    // Vertical blur (iterate over Y axis)
    let halfKernel = i32(kernelSize) / 2;
    for (var ky: i32 = -halfKernel; ky <= halfKernel; ky++) {
        let sampleY = i32(y) + ky;
        
        // Clamp to image bounds
        if (sampleY >= 0 && sampleY < i32(imageSize.y)) {
            let index = u32(sampleY) * imageSize.x + x;
            let kernelIndex = u32(ky + halfKernel);
            let weight = kernel[kernelIndex];
            
            color += inputImage[index] * weight;
            intensity += weight;
        }
    }
    
    // Normalize by total weight
    if (intensity > 0.0) {
        color /= intensity;
    }
    
    // Preserve alpha channel
    color.w = 1.0;
    
    // Write to output buffer
    let outputIndex = y * imageSize.x + x;
    outputImage[outputIndex] = color;
}