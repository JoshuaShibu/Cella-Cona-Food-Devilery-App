const apiUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";
 
export const dishesServices = async () => {
    const response = await fetch(`${apiUrl}/dishes`);
    const data = await response.json();
    console.log(data);
    return data;
  };
 