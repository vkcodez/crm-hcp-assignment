import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const sendChatMessage = createAsyncThunk(
  'interaction/sendChatMessage',
  async (message, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:8000/api/chat', { message });
      return response.data; 
    } catch (err) {
      return rejectWithValue(err.response.data);
    }
  }
);

const initialState = {
  formData: {
    hcp_name: '',
    interaction_type: 'Meeting',
    time: '07:36 PM',
    notes: '',
    sentiment: '', 
    brochures_shared: false,
  },
  chatHistory: [
    {
      role: 'agent',
      content: "Log interaction details here (e.g., 'Met Dr. Smith. Prodo-X efficacy; positive sentiment, shared brochures.')"
    }
  ],
  status: 'idle',
};

const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    addUserMessage: (state, action) => {
      state.chatHistory.push({ role: 'user', content: action.payload });
      state.status = 'loading';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.chatHistory.push({ role: 'agent', content: action.payload.reply });
        if (action.payload.form_updates) {
          state.formData = { ...state.formData, ...action.payload.form_updates };
        }
      })
      .addCase(sendChatMessage.rejected, (state) => {
        state.status = 'failed';
        state.chatHistory.push({ role: 'agent', content: 'Network error. Please try again.' });
      });
  }
});

export const { addUserMessage } = interactionSlice.actions;
export default interactionSlice.reducer;