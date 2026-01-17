// WebGPU Gaussian Blur - Horizontal Pass
// Compute Shader for horizontal blur using separable convolution

@group(0) @binding(0) var<storage, read> inputImage: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read_write> outputImage: array<vec4<f32>>;
@group(0) @binding(2) var<uniform> imageSize: vec2<u32>>;
@group(0) @binding(3) var<storage, read> kernel: array<f32>>;
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
    
    // Horizontal blur (iterate over X axis)
    let halfKernel = i32(kernelSize) / 2;
    for (var kx: i32 = -halfKernel; kx <= halfKernel; kx++) {
        let sampleX = i32(x) + kx;
        
        // Clamp to image bounds
        if (sampleX >= 0 && sampleX < i32(imageSize.x)) {
            let index = y * imageSize.x + u32(sampleX);
            let kernelIndex = u32(kx + halfKernel);
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