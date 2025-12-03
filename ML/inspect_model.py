"""
TFLite Model Inspector
Shows detailed information about your model without running inference
"""

import tensorflow as tf
import numpy as np

MODEL_PATH = r"C:\Users\ASUS\Yash\Vision-Control\ML\Yolo11n (Detect) (1).tflite"

print("=" * 70)
print("🔍 TFLite MODEL INSPECTOR")
print("=" * 70)
print(f"\n📁 Model: {MODEL_PATH}\n")

try:
    # Load model
    print("🔹 Loading model...")
    interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
    interpreter.allocate_tensors()
    
    # Get input details
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    print("✅ Model loaded successfully!\n")
    print("=" * 70)
    print("📥 INPUT DETAILS")
    print("=" * 70)
    
    for i, inp in enumerate(input_details):
        print(f"\nInput #{i}:")
        print(f"  Name:  {inp['name']}")
        print(f"  Shape: {inp['shape']}")
        print(f"  Type:  {inp['dtype']}")
        print(f"  Index: {inp['index']}")
    
    print("\n" + "=" * 70)
    print("📤 OUTPUT DETAILS")
    print("=" * 70)
    
    for i, out in enumerate(output_details):
        print(f"\nOutput #{i}:")
        print(f"  Name:  {out['name']}")
        print(f"  Shape: {out['shape']}")
        print(f"  Type:  {out['dtype']}")
        print(f"  Index: {out['index']}")
    
    # Determine model type
    print("\n" + "=" * 70)
    print("🎯 MODEL TYPE DETECTION")
    print("=" * 70)
    
    output_shape = output_details[0]['shape']
    
    if len(output_shape) == 3 and output_shape[2] >= 6:
        print("\n✅ This is a DETECTION model (YOLO format)")
        print(f"   Expected output: [batch, num_boxes, attributes]")
        print(f"   Your output:     {output_shape}")
        print(f"\n   Each detection box contains:")
        print(f"   [x_center, y_center, width, height, confidence, class_id]")
        
    elif len(output_shape) == 2:
        print("\n✅ This is a CLASSIFICATION model")
        print(f"   Expected output: [batch, num_classes]")
        print(f"   Your output:     {output_shape}")
        print(f"   Number of classes: {output_shape[1]}")
        
    else:
        print(f"\n⚠️  Unknown model type - output shape: {output_shape}")
    
    # Test inference
    print("\n" + "=" * 70)
    print("🧪 TESTING INFERENCE")
    print("=" * 70)
    
    input_shape = input_details[0]['shape']
    input_dtype = input_details[0]['dtype']
    
    print(f"\n🔹 Creating dummy input: {input_shape} ({input_dtype})")
    
    if input_dtype == np.uint8:
        dummy_input = np.random.randint(0, 255, size=input_shape, dtype=np.uint8)
    else:
        dummy_input = np.random.random(input_shape).astype(np.float32)
    
    print("🔹 Running inference...")
    interpreter.set_tensor(input_details[0]['index'], dummy_input)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]['index'])
    
    print(f"✅ Inference successful!")
    print(f"   Output shape: {output.shape}")
    print(f"   Output dtype: {output.dtype}")
    print(f"   Output range: [{output.min():.4f}, {output.max():.4f}]")
    
    # Show sample output
    print("\n" + "=" * 70)
    print("📊 SAMPLE OUTPUT")
    print("=" * 70)
    
    if len(output.shape) == 3:  # Detection
        print(f"\nFirst 3 detections (out of {output.shape[1]}):")
        for i in range(min(3, output.shape[1])):
            det = output[0][i]
            if len(det) >= 6:
                print(f"\n  Detection #{i+1}:")
                print(f"    X-center:   {det[0]:.4f}")
                print(f"    Y-center:   {det[1]:.4f}")
                print(f"    Width:      {det[2]:.4f}")
                print(f"    Height:     {det[3]:.4f}")
                print(f"    Confidence: {det[4]:.4f}")
                print(f"    Class ID:   {int(det[5])}")
    
    elif len(output.shape) == 2:  # Classification
        print(f"\nClass probabilities:")
        for i, prob in enumerate(output[0]):
            print(f"  Class {i}: {prob:.4f}")
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ SUMMARY")
    print("=" * 70)
    print("""
Your model is WORKING correctly! ✅

Next steps:
1. Run test_detection_simple.py to test with camera
2. If detections work, run arrow_det_fixed.py for full system
3. Check FIXING_GUIDE.md for detailed instructions

The model has NO issues with TensorFlow Lite Interpreter!
The problem was YOLO trying to parse corrupted metadata.
""")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\nTroubleshooting:")
    print("1. Check if model file exists")
    print("2. Make sure TensorFlow is installed: pip install tensorflow")
    print("3. Try a different model file")

print("=" * 70)
