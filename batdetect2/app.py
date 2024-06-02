import gradio as gr
import os
import datetime
import shutil
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

import bat_detect.utils.detector_utils as du
import bat_detect.utils.audio_utils as au
import bat_detect.utils.plot_utils as viz


# Setup the arguments
args = {}
args = du.get_default_bd_args()
args['detection_threshold'] = 0.3
args['time_expansion_factor'] = 10
args['model_path'] = 'models/Net2DFast_UK_same.pth.tar'
max_duration = 60.0

print(args)

# Load the model
model, params = du.load_model(args['model_path'])

df = gr.Dataframe(
    headers=["species", "time", "detection_prob", "species_prob"],
    datatype=["str", "str", "str", "str"],
    row_count=1,
    col_count=(4, "fixed"),
    label='Predictions'
)

def make_prediction(file_name=None, detection_threshold=0.3):
    if file_name is not None:
        audio_file = file_name
    else:
        return "You must provide an input audio file."
    
    if detection_threshold is not None and detection_threshold != '':
        args['detection_threshold'] = float(detection_threshold)
    
    # Process the file to generate predictions
    results = du.process_file(audio_file, model, params, args, max_duration=max_duration)
    
    anns = [ann for ann in results['pred_dict']['annotation']]
    clss = [aa['class'] for aa in anns]
    st_time = [aa['start_time'] for aa in anns]
    cls_prob = [aa['class_prob'] for aa in anns]
    det_prob = [aa['det_prob'] for aa in anns]
    data = {'species': clss, 'time': st_time, 'detection_prob': det_prob, 'species_prob': cls_prob}
    
    df = pd.DataFrame(data=data)
    im = generate_results_image(audio_file, anns)
    
    output_dir = '../output/audio_results'

    current_datetime = datetime.datetime.now().strftime("%Y-%m-%dT%H-%M-%S")

    csv_filename = f"data_{current_datetime}.csv"
    csv_path = os.path.join(output_dir, 'data', csv_filename)
    df.to_csv(csv_path, index=False)
    
    # Save image to PNG
    img_filename = f"image_{current_datetime}.png"
    img_path = os.path.join(output_dir, 'image', img_filename)
    plt.imsave(img_path, im)
    
    return [df, im, img_path]

def generate_results_image(audio_file, anns): 
    # Load audio
    sampling_rate, audio = au.load_audio_file(audio_file, args['time_expansion_factor'], 
                           params['target_samp_rate'], params['scale_raw_audio'], max_duration=max_duration)
    duration = audio.shape[0] / sampling_rate
        
    # Generate spec
    spec, spec_viz = au.generate_spectrogram(audio, sampling_rate, params, True, False)

    # Create fig
    plt.close('all')
    fig = plt.figure(1, figsize=(spec.shape[1]/100, spec.shape[0]/100), dpi=100, frameon=False)
    spec_duration = au.x_coords_to_time(spec.shape[1], sampling_rate, params['fft_win_length'], params['fft_overlap'])
    viz.create_box_image(spec, fig, anns, 0, spec_duration, spec_duration, params, spec.max()*1.1, False, True)
    plt.ylabel('Freq - kHz')
    plt.xlabel('Time - secs')
    plt.tight_layout()
    
    # Convert fig to image
    fig.canvas.draw()
    data = np.frombuffer(fig.canvas.tostring_rgb(), dtype=np.uint8)
    w, h = fig.canvas.get_width_height()
    im = data.reshape((int(h), int(w), -1))

    return im

# Set up directories
input_dir = '../input/audio'
processed_dir = '../processed/audio'

# Ensure the output directories exist
os.makedirs('../output/audio_results/data', exist_ok=True)
os.makedirs('../output/audio_results/image', exist_ok=True)
os.makedirs(processed_dir, exist_ok=True)

# Process each audio file in the input directory
for file_name in os.listdir(input_dir):
    if file_name.endswith('.WAV'):  # Assuming the audio files are in .wav format
        full_file_path = os.path.join(input_dir, file_name)
        try:
            print(f"Processing file: {file_name}")
            prediction_result = make_prediction(file_name=full_file_path, detection_threshold=args['detection_threshold'])
            df_result, im_result, im_path = prediction_result
            print(f"Results for file {file_name}:\n{df_result}")
            print(f"Image path for file {file_name}: {im_path}")
        except Exception as e:
            print(f"An error occurred while processing {file_name}: {e}")
        finally:
            # Move the processed file to the processed directory
            try:
                shutil.move(full_file_path, os.path.join(processed_dir, file_name))
                print(f"Moved {file_name} to {processed_dir}")
            except Exception as e:
                print(f"Failed to move {file_name} to {processed_dir}: {e}")

print("All files have been processed.")
