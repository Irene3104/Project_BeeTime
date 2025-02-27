import adminIconSearch from "../assets/admin_icon_search.png";

export const SearchBar = () => {
  return (
    <div className="flex items-center gap-2">
      <img src={adminIconSearch} alt="search" className="w-5 h-5" />
      <input
        type="text"
        placeholder="Search.."
        className="w-full md:w-64 px-2 py-2 rounded-lg font-montserrat text-14 focus:outline-none"
      />
    </div>
  );
}; 