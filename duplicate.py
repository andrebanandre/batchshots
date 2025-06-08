from transformers import ViTImageProcessor, ViTModel
from PIL import Image
import numpy as np
from skimage.metrics import structural_similarity as ssim
import cv2
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA


image1 = Image.open('screenshot1.png').convert('RGB')
image2 = Image.open('screenshot2.png').convert('RGB')


processor = ViTImageProcessor.from_pretrained('google/vit-base-patch16-224-in21k')
model = ViTModel.from_pretrained('google/vit-base-patch16-224-in21k')

# Process image 1
inputs1 = processor(images=image1, return_tensors="pt")
outputs1 = model(**inputs1)
last_hidden_states1 = outputs1.last_hidden_state
# Use the CLS token embedding (first token) as the image representation
embedding1 = last_hidden_states1[:, 0, :]

# Process image 2
inputs2 = processor(images=image2, return_tensors="pt")
outputs2 = model(**inputs2)
last_hidden_states2 = outputs2.last_hidden_state
# Use the CLS token embedding (first token) as the image representation
embedding2 = last_hidden_states2[:, 0, :]

# Other popular similarity/distance algorithms include:
#
# 1. Euclidean Distance:
#    - Measures the straight-line distance between two embedding vectors in the feature space.
#    - Formula: sqrt(sum((vec1_i - vec2_i)^2 for i in dimensions))
#    - Interpretation: Lower values indicate higher similarity.
#    - Use case: A basic and common distance metric, useful when the magnitude of differences matters.
#
# 2. Manhattan Distance (L1 Norm):
#    - Measures the sum of the absolute differences of their coordinates.
#    - Formula: sum(|vec1_i - vec2_i| for i in dimensions)
#    - Interpretation: Lower values indicate higher similarity.
#    - Use case: Can be more robust to outliers than Euclidean distance in some high-dimensional spaces.
#
# 3. Structural Similarity Index (SSIM):
#    - Designed to be more aligned with human visual perception.
#    - Compares luminance, contrast, and structure between two images directly (not usually on embeddings).
#    - Output: A value between -1 and 1 (or 0 and 1 in some implementations), where 1 means perfect similarity.
#    - Use case: Excellent for assessing perceptual image quality and similarity, often used in image compression and restoration.
#               Requires working directly with image pixel data or specific feature maps rather than generic embeddings like ViT's CLS token.
#
# 4. Mean SquaredError (MSE) / Peak Signal-to-Noise Ratio (PSNR):
#    - MSE calculates the average squared difference between pixel values of two images.
#    - Formula (MSE): (1/N) * sum((image1_pixel_i - image2_pixel_i)^2)
#    - PSNR is derived from MSE and is often expressed in decibels (dB). Higher PSNR generally means better quality/similarity.
#    - Interpretation (MSE): Lower values indicate higher similarity.
#    - Use case: Common for measuring the fidelity of a reconstructed image compared to an original. Like SSIM, typically applied directly to pixel data.

# Function to calculate cosine similarity
def cosine_similarity(vec1, vec2):
    vec1 = vec1.detach().numpy().flatten() # Detach from graph, convert to numpy, and flatten
    vec2 = vec2.detach().numpy().flatten() # Detach from graph, convert to numpy, and flatten
    
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0
    return dot_product / (magnitude1 * magnitude2)

# Function to calculate Euclidean distance
def euclidean_distance(vec1, vec2):
    vec1 = vec1.detach().numpy().flatten()
    vec2 = vec2.detach().numpy().flatten()
    
    return np.sqrt(np.sum((vec1 - vec2) ** 2))

# Function to calculate Manhattan distance
def manhattan_distance(vec1, vec2):
    vec1 = vec1.detach().numpy().flatten()
    vec2 = vec2.detach().numpy().flatten()
    
    return np.sum(np.abs(vec1 - vec2))

# Function to calculate SSIM (works directly on images)
def calculate_ssim(img1, img2):
    # Convert PIL images to numpy arrays
    img1_array = np.array(img1)
    img2_array = np.array(img2)
    
    # Convert to grayscale for SSIM calculation
    if len(img1_array.shape) == 3:
        img1_gray = cv2.cvtColor(img1_array, cv2.COLOR_RGB2GRAY)
    else:
        img1_gray = img1_array
        
    if len(img2_array.shape) == 3:
        img2_gray = cv2.cvtColor(img2_array, cv2.COLOR_RGB2GRAY)
    else:
        img2_gray = img2_array
    
    # Resize images to same size if they're different
    if img1_gray.shape != img2_gray.shape:
        height = min(img1_gray.shape[0], img2_gray.shape[0])
        width = min(img1_gray.shape[1], img2_gray.shape[1])
        img1_gray = cv2.resize(img1_gray, (width, height))
        img2_gray = cv2.resize(img2_gray, (width, height))
    
    # Calculate SSIM
    ssim_score = ssim(img1_gray, img2_gray)
    return ssim_score

# Function to calculate MSE (works directly on images)
def calculate_mse(img1, img2):
    # Convert PIL images to numpy arrays
    img1_array = np.array(img1).astype(np.float64)
    img2_array = np.array(img2).astype(np.float64)
    
    # Resize images to same size if they're different
    if img1_array.shape != img2_array.shape:
        height = min(img1_array.shape[0], img2_array.shape[0])
        width = min(img1_array.shape[1], img2_array.shape[1])
        if len(img1_array.shape) == 3:
            img1_array = cv2.resize(img1_array, (width, height))
            img2_array = cv2.resize(img2_array, (width, height))
        else:
            img1_array = cv2.resize(img1_array, (width, height))
            img2_array = cv2.resize(img2_array, (width, height))
    
    # Calculate MSE
    mse = np.mean((img1_array - img2_array) ** 2)
    return mse

# Function to calculate PSNR from MSE
def calculate_psnr(mse, max_pixel_value=255.0):
    if mse == 0:
        return float('inf')  # Perfect similarity
    return 20 * np.log10(max_pixel_value / np.sqrt(mse))

# Calculate similarity using all algorithms
print("=" * 60)
print("IMAGE SIMILARITY COMPARISON USING DIFFERENT ALGORITHMS")
print("=" * 60)

# 1. Cosine Similarity (on ViT embeddings)
cosine_sim = cosine_similarity(embedding1, embedding2)
print(f"\n1. Cosine Similarity (ViT embeddings): {cosine_sim:.4f}")
print("   Range: [-1, 1], Higher values = more similar")

# 2. Euclidean Distance (on ViT embeddings)
euclidean_dist = euclidean_distance(embedding1, embedding2)
print(f"\n2. Euclidean Distance (ViT embeddings): {euclidean_dist:.4f}")
print("   Range: [0, ∞], Lower values = more similar")

# 3. Manhattan Distance (on ViT embeddings)
manhattan_dist = manhattan_distance(embedding1, embedding2)
print(f"\n3. Manhattan Distance (ViT embeddings): {manhattan_dist:.4f}")
print("   Range: [0, ∞], Lower values = more similar")

# 4. SSIM (on original images)
ssim_score = calculate_ssim(image1, image2)
print(f"\n4. SSIM (Structural Similarity): {ssim_score:.4f}")
print("   Range: [-1, 1], Higher values = more similar")

# 5. MSE and PSNR (on original images)
mse_score = calculate_mse(image1, image2)
psnr_score = calculate_psnr(mse_score)
print(f"\n5. MSE (Mean Squared Error): {mse_score:.4f}")
print("   Range: [0, ∞], Lower values = more similar")
print(f"   PSNR (Peak Signal-to-Noise Ratio): {psnr_score:.2f} dB")
print("   Range: [0, ∞], Higher values = more similar")

print("\n" + "=" * 60)
print("SIMILARITY ASSESSMENT")
print("=" * 60)

# Determine if images are similar based on different thresholds
cosine_threshold = 0.90
euclidean_threshold = 10.0  # This threshold may need adjustment based on your data
manhattan_threshold = 100.0  # This threshold may need adjustment based on your data
ssim_threshold = 0.80
mse_threshold = 1000.0  # Lower MSE = more similar
psnr_threshold = 20.0  # Higher PSNR = more similar

print(f"\nUsing thresholds:")
print(f"  Cosine Similarity > {cosine_threshold}")
print(f"  Euclidean Distance < {euclidean_threshold}")
print(f"  Manhattan Distance < {manhattan_threshold}")
print(f"  SSIM > {ssim_threshold}")
print(f"  MSE < {mse_threshold}")
print(f"  PSNR > {psnr_threshold} dB")

print(f"\nResults:")
print(f"  Cosine Similarity: {'SIMILAR' if cosine_sim > cosine_threshold else 'DIFFERENT'}")
print(f"  Euclidean Distance: {'SIMILAR' if euclidean_dist < euclidean_threshold else 'DIFFERENT'}")
print(f"  Manhattan Distance: {'SIMILAR' if manhattan_dist < manhattan_threshold else 'DIFFERENT'}")
print(f"  SSIM: {'SIMILAR' if ssim_score > ssim_threshold else 'DIFFERENT'}")
print(f"  MSE: {'SIMILAR' if mse_score < mse_threshold else 'DIFFERENT'}")
print(f"  PSNR: {'SIMILAR' if psnr_score > psnr_threshold else 'DIFFERENT'}")

# Function to plot embeddings
def plot_embeddings(emb1, emb2, title='Image Embeddings Visualization'):
    emb1_np = emb1.detach().numpy().flatten().reshape(1, -1)
    emb2_np = emb2.detach().numpy().flatten().reshape(1, -1)
    
    # Combine embeddings for PCA
    combined_embeddings = np.vstack((emb1_np, emb2_np))
    
    # Apply PCA to reduce to 2 dimensions
    # n_components should be min(n_samples, n_features)
    # Here, n_samples=2, n_features=embedding_dim. If embedding_dim is 1, PCA to 2D is not useful.
    # We'll use 1D if embedding_dim is 1, otherwise 2D.
    if combined_embeddings.shape[1] == 1:
        pca = PCA(n_components=1)
        reduced_embeddings = pca.fit_transform(combined_embeddings)
        # For 1D PCA, we plot on a line. We'll make the y-coordinates 0.
        emb1_2d = [reduced_embeddings[0, 0], 0]
        emb2_2d = [reduced_embeddings[1, 0], 0]
        x_label = "Principal Component 1"
        y_label = ""
    else:
        pca = PCA(n_components=2)
        reduced_embeddings = pca.fit_transform(combined_embeddings)
        emb1_2d = reduced_embeddings[0]
        emb2_2d = reduced_embeddings[1]
        x_label = "Principal Component 1"
        y_label = "Principal Component 2"

    plt.figure(figsize=(8, 6))
    plt.scatter(emb1_2d[0], emb1_2d[1], color='blue', label='Image 1 Embedding', s=100)
    plt.scatter(emb2_2d[0], emb2_2d[1], color='red', label='Image 2 Embedding', s=100)
    
    # Draw a line between the points
    plt.plot([emb1_2d[0], emb2_2d[0]], [emb1_2d[1], emb2_2d[1]], linestyle='--', color='gray', alpha=0.7)
    
    plt.title(title)
    plt.xlabel(x_label)
    plt.ylabel(y_label)
    plt.legend()
    plt.grid(True)
    plt.axhline(0, color='black', linewidth=0.5)
    plt.axvline(0, color='black', linewidth=0.5)
    # Save the plot to a file
    plot_filename = "embedding_visualization.png"
    plt.savefig(plot_filename)
    print(f"\nEmbedding visualization saved to {plot_filename}")
    # plt.show() # Uncomment if you want to display the plot directly when running the script

# Visualize embeddings
plot_embeddings(embedding1, embedding2)

# Example of how you might get the last_hidden_state if you were to follow the web app's approach more closely
# This is just for illustration; the CLS token is often preferred for image-level tasks.
# feature_vector1 = outputs1.last_hidden_state.mean(dim=1) # Average pooling of all patch embeddings
# feature_vector2 = outputs2.last_hidden_state.mean(dim=1)
# similarity_avg_pool = cosine_similarity(feature_vector1, feature_vector2)
# print(f"Cosine Similarity (Avg Pool): {similarity_avg_pool:.4f}")
